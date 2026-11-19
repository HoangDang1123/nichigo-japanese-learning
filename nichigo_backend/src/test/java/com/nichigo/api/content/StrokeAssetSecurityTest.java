package com.nichigo.api.content;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class StrokeAssetSecurityTest {
    @TempDir Path root;
    private final StrokeAssetValidator validator = new StrokeAssetValidator(new ObjectMapper());
    private static byte[] asset(String path) {
        return ("{\"assetVersion\":1,\"glyph\":\"山\",\"codepoint\":\"U+5C71\",\"viewBox\":{\"width\":1024,\"height\":1024},\"strokeCount\":1,\"strokes\":[{\"order\":1,\"outline\":[\""+path+"\"],\"numberAt\":{\"x\":1,\"y\":1}}]}")
                .getBytes(StandardCharsets.UTF_8);
    }
    private static String hash(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    @Test void rejectsMalformedBytesAndPaths() throws Exception {
        byte[] good=asset("M 1 1 L 2 2");
        validator.validate(good,"山",hash(good),"application/json");
        assertThrows(IllegalArgumentException.class,()->validator.validate(good,"川",hash(good),"application/json"));
        assertThrows(IllegalArgumentException.class,()->validator.validate(good,"山","0".repeat(64),"application/json"));
        assertThrows(IllegalArgumentException.class,()->validator.validate(good,"山",hash(good),"image/svg+xml"));
        for (String bad : new String[]{"M 1", "M 1 1", "M 1 1 L 2", "M 1 1 <script>", "M 1 1 A 2 2", "M 99999 1 L 2 2"}) {
            byte[] bytes=asset(bad);
            assertThrows(IllegalArgumentException.class,()->validator.validate(bytes,"山",hash(bytes),"application/json"));
        }
        byte[] oversized=new byte[StrokeAssetValidator.MAX_BYTES+1];
        assertThrows(IllegalArgumentException.class,()->validator.validate(oversized,"山",hash(oversized),"application/json"));
        byte[] duplicate=new String(good,StandardCharsets.UTF_8).replace("\"assetVersion\":1,", "\"assetVersion\":1,\"assetVersion\":1,").getBytes(StandardCharsets.UTF_8);
        assertThrows(IllegalArgumentException.class,()->validator.validate(duplicate,"山",hash(duplicate),"application/json"));
    }

    @Test void evaluatesAbsoluteAndRelativeGeometryAgainstViewBox() throws Exception {
        for (String good : new String[]{
                "M 500 500 C 1500 500 -500 500 500 500 L 520 520", // controls outside; curve stays inside
                "m 10 10 l 20 0 h 20 v 20 z", "M 1 1 q 20 20 40 0 t 40 0",
                "M 0 0 C 10 10 20 20 30 30 s 20 20 30 30"}) {
            byte[] bytes=asset(good);
            validator.validate(bytes,"山",hash(bytes),"application/json");
        }
        for (String bad : new String[]{
                "M 0 0 L 5000 0", "m 10 10 l 5000 0", "M 0 0 h 5000",
                "M 0 0 C 10000 0 10000 0 0 0", // endpoints inside; curve escapes
                "M 0 0 C 1 2 3 4", "M 0 0 l 1", "M 0 0 q 1 2 3"}) {
            byte[] bytes=asset(bad);
            assertThrows(IllegalArgumentException.class,()->validator.validate(bytes,"山",hash(bytes),"application/json"),bad);
        }
    }

    @Test void validatesConsecutiveAndClosedSubpaths() throws Exception {
        for (String good : new String[]{
                "M 10 10 L 20 20 M 30 30 L 40 40",
                "M 10 10 M 30 30 L 40 40",
                "M 10 10 L 20 20 Z M 30 30 L 40 40 Z",
                "m 10 10 l 10 10 z m 30 30 l 10 10"}) {
            byte[] bytes=asset(good);
            validator.validate(bytes,"山",hash(bytes),"application/json");
        }
        for (String bad : new String[]{
                "M 5000 10 L 20 20", // initial subpath start
                "M 10 10 L 20 20 M 30 30 L 5000 40", // second subpath end
                "M 10 10 L 20 20 Z M 5000 30 L 40 40", // start after Z
                "m 10 10 l 10 10 z m 5000 30 l 10 10", // relative start after Z
                "M 10 10 L 20 20 Z 30 30", // numbers without command after Z
                "M 10 10 L 20 20 Z M 30", // incomplete move after Z
                "M 10 10 L 20 20 Z X 30 30"}) {
            byte[] bytes=asset(bad);
            assertThrows(IllegalArgumentException.class,
                    ()->validator.validate(bytes,"山",hash(bytes),"application/json"),bad);
        }
    }

    @Test void filesystemCannotEscapeOrOverwrite() throws Exception {
        var storage=new PrivateFilesystemStrokeStorage(root.toString());
        byte[] good=asset("M 1 1 L 2 2");
        storage.putImmutable("stroke/glyph.json",good);
        assertArrayEquals(good,storage.read("stroke/glyph.json"));
        storage.putImmutable("stroke/glyph.json",good);
        assertThrows(IllegalStateException.class,()->storage.putImmutable("stroke/glyph.json",asset("M 2 2 L 3 3")));
        Path large=root.resolve("stroke/large.json");
        Files.write(large,new byte[StrokeAssetValidator.MAX_BYTES+1]);
        assertThrows(IllegalStateException.class,()->storage.read("stroke/large.json"));
        for(String key:new String[]{"../escape", "stroke/../../escape", "/absolute", "C:/absolute", "stroke\\escape"})
            assertThrows(RuntimeException.class,()->storage.read(key));
        assertThrows(IllegalStateException.class,()->new PrivateFilesystemStrokeStorage("").read("stroke/glyph.json"));
        Path outside=Files.createTempFile("stroke-outside-", ".json");
        try {
            Path link=root.resolve("link");
            try { Files.createSymbolicLink(link,outside); }
            catch (UnsupportedOperationException | java.nio.file.FileSystemException | SecurityException ex) { return; }
            assertThrows(IllegalStateException.class,()->storage.read("link"));
        } finally { Files.deleteIfExists(outside); }
    }

    @Test void rejectsParentAndTargetSymlinks() throws Exception {
        var storage=new PrivateFilesystemStrokeStorage(root.toString());
        Path outside=Files.createTempDirectory("stroke-outside-");
        try {
            Path parent=root.resolve("linked-parent"), target=root.resolve("linked-target");
            try {
                Files.createSymbolicLink(parent,outside);
                Files.createSymbolicLink(target,outside.resolve("asset.json"));
            } catch (UnsupportedOperationException | java.nio.file.FileSystemException | SecurityException ex) {
                org.junit.jupiter.api.Assumptions.abort("Filesystem does not permit test symlinks");
            }
            byte[] bytes=asset("M 1 1 L 2 2");
            assertThrows(IllegalStateException.class,()->storage.read("linked-parent/asset.json"));
            assertThrows(IllegalStateException.class,()->storage.putImmutable("linked-parent/asset.json",bytes));
            assertThrows(IllegalStateException.class,()->storage.read("linked-target"));
            assertThrows(IllegalStateException.class,()->storage.putImmutable("linked-target",bytes));
            assertFalse(Files.exists(outside.resolve("asset.json")));
        } finally { Files.deleteIfExists(outside); }
    }

    @Test void concurrentImmutableWritesCannotReplaceEachOther() throws Exception {
        var storage=new PrivateFilesystemStrokeStorage(root.toString());
        byte[] one=asset("M 1 1 L 2 2"), two=asset("M 2 2 L 3 3");
        var start=new CountDownLatch(1);
        try (var pool=Executors.newFixedThreadPool(2)) {
            var first=pool.submit(() -> { start.await(); storage.putImmutable("race/asset.json",one); return true; });
            var second=pool.submit(() -> { start.await(); storage.putImmutable("race/asset.json",two); return true; });
            start.countDown();
            int successful=0;
            for (var task : java.util.List.of(first,second)) {
                try { if (task.get(5,TimeUnit.SECONDS)) successful++; }
                catch (java.util.concurrent.ExecutionException ex) { assertInstanceOf(IllegalStateException.class,ex.getCause()); }
            }
            assertEquals(1,successful);
            byte[] stored=storage.read("race/asset.json");
            assertTrue(java.util.Arrays.equals(stored,one) || java.util.Arrays.equals(stored,two));
        }
    }
}
