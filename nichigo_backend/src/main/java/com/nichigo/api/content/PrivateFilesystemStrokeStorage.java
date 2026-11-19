package com.nichigo.api.content;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Arrays;
import java.util.UUID;

/** No public static mapping. The configured root must already exist as a private mount. */
@Component
public final class PrivateFilesystemStrokeStorage implements StrokeAssetStorage {
    private final String configuredRoot;
    public PrivateFilesystemStrokeStorage(@Value("${nichigo.stroke.storage-root:}") String root) {
        this.configuredRoot = root;
    }

    private Path root() {
        if (configuredRoot.isBlank()) throw new IllegalStateException("Stroke storage unavailable.");
        Path root = Path.of(configuredRoot);
        if (!root.isAbsolute() || !Files.isDirectory(root, LinkOption.NOFOLLOW_LINKS)
                || root.toString().matches("(?i).*[/\\\\](?:static|public)(?:[/\\\\].*)?"))
            throw new IllegalStateException("Stroke storage unavailable.");
        for (Path path = root; path != null; path = path.getParent())
            if (Files.isSymbolicLink(path)) throw new IllegalStateException("Stroke storage unavailable.");
        return root.normalize();
    }
    private Path target(String key, boolean createParents) throws IOException {
        if (key == null || key.length() > 300 || !key.matches("[a-zA-Z0-9_-]+(?:/[a-zA-Z0-9_.-]+)*")
                || key.contains("..")) throw new IllegalStateException("Stroke storage unavailable.");
        Path root = root(), target = root.resolve(key).normalize();
        Path realRoot = root.toRealPath();
        if (!target.startsWith(root) || target.equals(root)) throw new IllegalStateException("Stroke storage unavailable.");
        Path parent = target.getParent();
        for (Path path = root; !path.equals(parent); ) {
            path = path.resolve(root.relativize(parent).getName(path.equals(root) ? 0 : root.relativize(path).getNameCount()));
            if (createParents && !Files.exists(path, LinkOption.NOFOLLOW_LINKS)) Files.createDirectory(path);
            if (!Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS) || !path.toRealPath().startsWith(realRoot))
                throw new IllegalStateException("Stroke storage unavailable.");
        }
        return target;
    }
    @Override public byte[] read(String key) {
        try {
            Path target = target(key, false);
            Path realRoot = root().toRealPath();
            if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)
                    || !target.toRealPath().startsWith(realRoot)) throw new IOException();
            BasicFileAttributes before = Files.readAttributes(target, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
            byte[] bytes;
            try (InputStream input = Files.newInputStream(target, StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS)) {
                bytes = input.readNBytes(StrokeAssetValidator.MAX_BYTES + 1);
            }
            BasicFileAttributes after = Files.readAttributes(target, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
            if (bytes.length > StrokeAssetValidator.MAX_BYTES || !after.isRegularFile()
                    || !target.toRealPath().startsWith(realRoot)
                    || before.fileKey() != null && !before.fileKey().equals(after.fileKey())) throw new IOException();
            return bytes;
        } catch (IOException | IllegalArgumentException ex) { throw new IllegalStateException("Stroke storage unavailable."); }
    }
    @Override public synchronized void putImmutable(String key, byte[] bytes) {
        if (bytes.length == 0 || bytes.length > StrokeAssetValidator.MAX_BYTES) throw new IllegalArgumentException("Invalid stroke asset.");
        Path temporary = null;
        try {
            Path target = target(key, true);
            if (Files.exists(target, LinkOption.NOFOLLOW_LINKS)) {
                if (Arrays.equals(read(key), bytes)) return;
                throw new IllegalStateException("Stroke asset key already occupied.");
            }
            temporary = target.getParent().resolve(".stroke-" + UUID.randomUUID() + ".tmp");
            Files.write(temporary, bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            if (!target.getParent().toRealPath().startsWith(root().toRealPath())) throw new IOException();
            // A hard link makes the verified temp bytes visible atomically, without replacing an existing target.
            Files.createLink(target, temporary);
            if (!target.toRealPath().startsWith(root().toRealPath()) || !Arrays.equals(read(key), bytes))
                throw new IOException();
        } catch (IOException ex) { throw new IllegalStateException("Stroke storage unavailable."); }
        finally { if (temporary != null) try { Files.deleteIfExists(temporary); } catch (IOException ignored) { } }
    }
}
