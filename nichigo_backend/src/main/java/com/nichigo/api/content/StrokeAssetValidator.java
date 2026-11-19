package com.nichigo.api.content;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.core.json.JsonFactory;

import java.nio.charset.StandardCharsets;
import java.nio.charset.CodingErrorAction;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Set;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Bounded, closed JSON contract. Path strings are data, never SVG markup. */
@Component
public final class StrokeAssetValidator {
    public static final int MAX_BYTES = 256 * 1024;
    private static final int MAX_STROKES = 64, MAX_PARTS = 16, MAX_TOTAL_PARTS = 256;
    private static final Pattern PATH_TOKEN = Pattern.compile("[MmLlHhVvCcSsQqTtZz]|[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?");
    private static final Set<String> ROOT = Set.of("assetVersion", "glyph", "codepoint", "viewBox", "strokeCount", "strokes");
    private static final Set<String> STROKE = Set.of("order", "outline", "numberAt", "arrow");
    private static final JsonFactory STRICT_JSON = JsonFactory.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
    private final ObjectMapper json;

    public StrokeAssetValidator(ObjectMapper json) { this.json = json; }

    public void validate(byte[] bytes, String glyph, String checksum, String mime) {
        if (!"application/json".equals(mime) || bytes.length == 0 || bytes.length > MAX_BYTES
                || !HexFormat.of().formatHex(sha(bytes)).equals(checksum)) invalid();
        JsonNode root;
        String source;
        try { source = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString(); }
        catch (Exception ex) { invalid(); return; }
        depth(source);
        try (var parser = STRICT_JSON.createParser(source)) {
            root = json.readTree(parser);
            if (parser.nextToken() != null) invalid();
        }
        catch (RuntimeException ex) { invalid(); return; }
        if (!fields(root, ROOT) || integer(root.path("assetVersion"), 1, 1)
                || !glyph.equals(root.path("glyph").asText()) || glyph.codePointCount(0, glyph.length()) != 1
                || !String.format("U+%04X", glyph.codePointAt(0)).equals(root.path("codepoint").asText())) invalid();
        JsonNode box = root.path("viewBox");
        if (!fields(box, Set.of("width", "height"))) invalid();
        double width = number(box.path("width"), 1, 4096), height = number(box.path("height"), 1, 4096);
        JsonNode strokes = root.path("strokes");
        if (!strokes.isArray() || strokes.isEmpty() || strokes.size() > MAX_STROKES
                || integer(root.path("strokeCount"), strokes.size(), strokes.size())) invalid();
        int parts = 0;
        for (int i = 0; i < strokes.size(); i++) {
            JsonNode stroke = strokes.get(i);
            if (!fields(stroke, STROKE) || integer(stroke.path("order"), i + 1, i + 1)) invalid();
            JsonNode outlines = stroke.path("outline");
            if (!outlines.isArray() || outlines.isEmpty() || outlines.size() > MAX_PARTS) invalid();
            parts += outlines.size();
            if (parts > MAX_TOTAL_PARTS) invalid();
            for (JsonNode path : outlines) path(path, width, height);
            point(stroke.path("numberAt"), width, height);
            if (stroke.has("arrow")) {
                JsonNode arrow = stroke.path("arrow");
                if (!fields(arrow, Set.of("from", "to"))) invalid();
                point(arrow.path("from"), width, height);
                point(arrow.path("to"), width, height);
            }
        }
    }

    private static boolean fields(JsonNode node, Set<String> allowed) {
        if (!node.isObject()) return false;
        var names = node.propertyNames();
        for (String name : names) if (!allowed.contains(name)) return false;
        return true;
    }
    private static boolean integer(JsonNode node, int min, int max) {
        return !node.isIntegralNumber() || node.asInt() < min || node.asInt() > max;
    }
    private static double number(JsonNode node, double min, double max) {
        if (!node.isNumber()) { invalid(); return 0; }
        double value = node.asDouble();
        if (!Double.isFinite(value) || value < min || value > max) invalid();
        return value;
    }
    private static void point(JsonNode node, double width, double height) {
        if (!fields(node, Set.of("x", "y"))) invalid();
        number(node.path("x"), 0, width);
        number(node.path("y"), 0, height);
    }
    private static void path(JsonNode node, double width, double height) {
        if (!node.isTextual()) invalid();
        String data = node.asText();
        if (data.isBlank() || data.length() > 8192 || data.indexOf('<') >= 0) invalid();
        Matcher matcher = PATH_TOKEN.matcher(data);
        int end = 0, tokens = 0;
        var parsed = new ArrayList<String>();
        while (matcher.find()) {
            if (!data.substring(end, matcher.start()).matches("[\\s,]*")) invalid();
            String token = matcher.group();
            if (!Character.isLetter(token.charAt(0))) {
                double value = Double.parseDouble(token);
                // Arithmetic ceiling only; viewBox limits apply to the resulting curve, not its controls.
                if (!Double.isFinite(value) || Math.abs(value) > 1_000_000) invalid();
            }
            parsed.add(token);
            end = matcher.end();
            if (++tokens > 2048) invalid();
        }
        if (parsed.isEmpty() || !parsed.getFirst().matches("[Mm]")
                || !data.substring(end).matches("[\\s,]*")) invalid();
        boolean draws = false;
        double margin = Math.max(24, Math.max(width, height) * 0.05);
        Point current = new Point(0, 0), start = current, cubicControl = current, quadraticControl = current;
        char previous = 0;
        for (int i = 0; i < parsed.size();) {
            String command = parsed.get(i++);
            if (!command.matches("[MmLlHhVvCcSsQqTtZz]")) invalid();
            char cmd = command.charAt(0), upper = Character.toUpperCase(cmd);
            boolean relative = Character.isLowerCase(cmd);
            if (upper == 'Z') {
                current = start;
                previous = 'Z';
                continue;
            }
            int count = 0;
            while (i + count < parsed.size() && !parsed.get(i + count).matches("[MmLlHhVvCcSsQqTtZz]")) count++;
            int arity = switch (upper) { case 'M', 'L', 'T' -> 2; case 'H', 'V' -> 1;
                case 'C' -> 6; case 'S', 'Q' -> 4; default -> -1; };
            if (arity < 0 || count < arity || count % arity != 0) invalid();
            int endIndex = i + count;
            boolean firstMove = true;
            while (i < endIndex) {
                char operation = upper == 'M' && !firstMove ? 'L' : upper;
                firstMove = false;
                Point next;
                switch (operation) {
                    case 'M', 'L' -> {
                        next = point(parsed, i, relative, current); i += 2;
                        if (operation == 'M') start = next;
                        else draws = true;
                    }
                    case 'H' -> { next = new Point(number(parsed, i++) + (relative ? current.x : 0), current.y); draws = true; }
                    case 'V' -> { next = new Point(current.x, number(parsed, i++) + (relative ? current.y : 0)); draws = true; }
                    case 'C' -> {
                        Point c1 = point(parsed, i, relative, current), c2 = point(parsed, i + 2, relative, current);
                        next = point(parsed, i + 4, relative, current); i += 6;
                        cubic(current, c1, c2, next, width, height, margin);
                        cubicControl = c2; draws = true;
                    }
                    case 'S' -> {
                        Point c1 = previous == 'C' || previous == 'S' ? reflect(current, cubicControl) : current;
                        Point c2 = point(parsed, i, relative, current);
                        next = point(parsed, i + 2, relative, current); i += 4;
                        cubic(current, c1, c2, next, width, height, margin);
                        cubicControl = c2; draws = true;
                    }
                    case 'Q' -> {
                        Point control = point(parsed, i, relative, current);
                        next = point(parsed, i + 2, relative, current); i += 4;
                        quadratic(current, control, next, width, height, margin);
                        quadraticControl = control; draws = true;
                    }
                    case 'T' -> {
                        Point control = previous == 'Q' || previous == 'T' ? reflect(current, quadraticControl) : current;
                        next = point(parsed, i, relative, current); i += 2;
                        quadratic(current, control, next, width, height, margin);
                        quadraticControl = control; draws = true;
                    }
                    default -> throw new IllegalStateException();
                }
                bounds(next, width, height, margin);
                current = next;
                previous = operation;
            }
        }
        if (!draws) invalid();
    }
    private record Point(double x, double y) {}
    private static double number(ArrayList<String> tokens, int index) { return Double.parseDouble(tokens.get(index)); }
    private static Point point(ArrayList<String> tokens, int index, boolean relative, Point base) {
        return new Point(number(tokens,index) + (relative ? base.x : 0),
                number(tokens,index+1) + (relative ? base.y : 0));
    }
    private static Point reflect(Point at, Point control) { return new Point(2*at.x-control.x, 2*at.y-control.y); }
    private static void bounds(Point p, double width, double height, double margin) {
        if (!Double.isFinite(p.x) || !Double.isFinite(p.y) || p.x < -margin || p.y < -margin
                || p.x > width + margin || p.y > height + margin) invalid();
    }
    private static void quadratic(Point a, Point b, Point c, double w, double h, double margin) {
        extremaQuadratic(a.x,b.x,c.x,w,margin);
        extremaQuadratic(a.y,b.y,c.y,h,margin);
    }
    private static void extremaQuadratic(double a, double b, double c, double max, double margin) {
        double denominator = a - 2*b + c;
        if (denominator == 0) return;
        double t = (a-b)/denominator;
        if (t > 0 && t < 1) checkValue((1-t)*(1-t)*a + 2*(1-t)*t*b + t*t*c,max,margin);
    }
    private static void cubic(Point a, Point b, Point c, Point d, double w, double h, double margin) {
        extremaCubic(a.x,b.x,c.x,d.x,w,margin);
        extremaCubic(a.y,b.y,c.y,d.y,h,margin);
    }
    private static void extremaCubic(double p0, double p1, double p2, double p3, double max, double margin) {
        double a = -p0+3*p1-3*p2+p3, b = 2*(p0-2*p1+p2), c = p1-p0;
        if (Math.abs(a) < 1e-12) {
            if (Math.abs(b) > 1e-12) checkCubicAt(-c/b,p0,p1,p2,p3,max,margin);
            return;
        }
        double discriminant = b*b-4*a*c;
        if (discriminant < 0) return;
        double root = Math.sqrt(discriminant);
        checkCubicAt((-b-root)/(2*a),p0,p1,p2,p3,max,margin);
        checkCubicAt((-b+root)/(2*a),p0,p1,p2,p3,max,margin);
    }
    private static void checkCubicAt(double t,double a,double b,double c,double d,double max,double margin) {
        if (t > 0 && t < 1) {
            double u=1-t;
            checkValue(u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d,max,margin);
        }
    }
    private static void checkValue(double value,double max,double margin) {
        if (!Double.isFinite(value) || value < -margin || value > max+margin) invalid();
    }
    private static void depth(String source) {
        int level = 0;
        boolean quoted = false, escaped = false;
        for (int i = 0; i < source.length(); i++) {
            char c = source.charAt(i);
            if (quoted) {
                if (escaped) escaped = false;
                else if (c == '\\') escaped = true;
                else if (c == '"') quoted = false;
            } else if (c == '"') quoted = true;
            else if (c == '{' || c == '[') { if (++level > 12) invalid(); }
            else if (c == '}' || c == ']') { if (--level < 0) invalid(); }
        }
        if (quoted || level != 0) invalid();
    }
    private static byte[] sha(byte[] bytes) {
        try { return MessageDigest.getInstance("SHA-256").digest(bytes); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    private static void invalid() { throw new IllegalArgumentException("Invalid stroke asset."); }
}
