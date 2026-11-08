package com.nichigo.api.contentimport;

import com.nichigo.api.ApiApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Local operator entry point. Mutations require a token provided on stdin, never argv. */
public final class ContentOperatorCli {
    private static final ObjectMapper JSON=new ObjectMapper();
    private static final PrintStream RESULT=System.out;
    private ContentOperatorCli(){}
    public static void main(String[] args){System.exit(run(args));}
    static int run(String[] args){
        if(args.length<1){emit(Map.of("code","USAGE"));return 2;}
        boolean readOnly=List.of("validate","dry-run","preview","inspect").contains(args[0]);
        if(args[0].equals("validate")){
            if(args.length!=2)return usage();
            try {var report=new ContentPackageValidator().dryRun(files(args[1]),null);emit(report);return report.valid()?0:1;}
            catch(Exception e){emit(Map.of("code","INPUT_ERROR"));return 2;}
        }
        if(!readOnly && !List.of("import","rights","language","publish").contains(args[0]))return usage();
        ContentOperatorAuth.Principal operator;
        try{operator=readOnly?null:authenticate();}
        catch(SecurityException | IOException ex){emit(Map.of("code","AUTH_FAILED"));return 3;}
        System.setProperty("logging.level.root","OFF");
        System.setProperty("logging.level.com.nichigo","OFF");
        System.setProperty("spring.main.log-startup-info","false");
        System.setOut(System.err);
        try(ConfigurableApplicationContext context=new SpringApplicationBuilder(ApiApplication.class)
                .web(WebApplicationType.NONE)
                .run("--spring.flyway.enabled="+!readOnly,"--spring.main.banner-mode=off",
                        "--debug=false","--trace=false","--logging.level.root=OFF","--logging.level.com.nichigo=OFF")) {
            var db=context.getBean(JdbcTemplate.class);
            switch(args[0]){
                case "dry-run" -> {
                    if(args.length!=2)return usage();
                    var report=context.getBean(ContentPackageValidator.class).dryRun(files(args[1]),context.getBean(JdbcContentReferenceResolver.class));
                    emit(report);return report.valid()?0:1;
                }
                case "preview" -> {
                    if(args.length!=3)return usage();
                    emit(context.getBean(ContentPublicationService.class).preview(args[1],args[2]));return 0;
                }
                case "inspect" -> {
                    if(args.length==3 && args[1].equals("batch")) {
                        var rows=db.queryForList("SELECT id,package_key,package_version,checksum_sha256,operator_id,status,error_summary,entity_counts,created_at,completed_at FROM content_import_batches WHERE id=?",UUID.fromString(args[2]));
                        for(var row:rows)row.put("entity_counts",JSON.readTree(row.get("entity_counts").toString()));
                        emit(rows);return 0;
                    }
                    if(args.length==4 && args[1].equals("publication")) {
                        String table=switch(args[2]){case "media"->"media_assets";case "item"->"content_items";case "lesson"->"lessons";case "path"->"learning_paths";default->throw new IllegalArgumentException("Unknown content kind.");};
                        String keyColumn=args[2].equals("path")?"slug":"stable_key";
                        var rows=db.queryForList("SELECT a.entity_kind,a.revision,a.edit_version,a.operator_id,a.selected_pins,a.published_at FROM content_publication_audit a JOIN "+table+" e ON e.id=a.entity_id WHERE a.entity_kind=? AND e."+keyColumn+"=? ORDER BY a.published_at",args[2],args[3]);
                        for(var row:rows)row.put("selected_pins",JSON.readTree(row.get("selected_pins").toString()));
                        emit(rows);return 0;
                    }
                    return usage();
                }
                case "import" -> {
                    if(args.length!=3 || !args[2].equals("--confirm"))return usage();
                    emit(context.getBean(ContentImportService.class).apply(files(args[1]),operator));return 0;
                }
                case "rights" -> {
                    if(args.length!=5 || !args[1].equals("review") || !args[4].equals("--confirm"))return usage();
                    emit(Map.of("rightsEventId",context.getBean(ContentReviewService.class).reviewRights(args[2],args[3],operator)));return 0;
                }
                case "language" -> {
                    if(args.length!=6 || !args[1].equals("review") || !args[5].equals("--confirm"))return usage();
                    emit(Map.of("reviewedEditVersion",context.getBean(ContentReviewService.class).reviewLanguage(args[2],args[3],Long.parseLong(args[4]),operator)));return 0;
                }
                case "publish" -> {
                    if(args.length<6 || !args[args.length-1].equals("--confirm") || !args[3].equals("--expected-version"))return usage();
                    Map<String,Integer> pins=new LinkedHashMap<>();
                    for(int i=5;i<args.length-1;i+=2){
                        if(i+1>=args.length-1 || !args[i].equals("--pin"))return usage();
                        String[] pair=args[i+1].split("=",2);
                        if(pair.length!=2 || pins.putIfAbsent(pair[0],Integer.parseInt(pair[1]))!=null)return usage();
                    }
                    emit(context.getBean(ContentPublicationService.class).publish(args[1],args[2],Long.parseLong(args[4]),pins,operator));return 0;
                }
                default -> {return usage();}
            }
        } catch(SecurityException ex){emit(Map.of("code","AUTH_FAILED"));return 3;}
          catch(IllegalArgumentException | IllegalStateException ex){emit(Map.of("code","CONTENT_CONFLICT","message",safe(ex.getMessage())));return 1;}
          catch(Exception ex){emit(Map.of("code","EXECUTION_FAILED"));return 2;}
          finally{System.setOut(RESULT);}
    }
    private static ContentOperatorAuth.Principal authenticate() throws IOException {
        char[] secret;
        if(System.console()!=null)secret=System.console().readPassword("Operator token: ");
        else {System.err.print("Operator token on stdin: ");String line=new BufferedReader(new InputStreamReader(System.in)).readLine();if(line==null)throw new SecurityException("Operator token missing.");secret=line.toCharArray();}
        try{return new ContentOperatorAuth(System.getenv().getOrDefault("CONTENT_OPERATOR_ID",""),
                System.getenv().getOrDefault("CONTENT_OPERATOR_TOKEN_SHA256","")).authenticate(secret);}
        finally{if(secret!=null)Arrays.fill(secret,'\0');}
    }
    private static Map<String,byte[]> files(String input) throws IOException {
        Path path=Path.of(input).toAbsolutePath().normalize();
        Path dir=Files.isDirectory(path,LinkOption.NOFOLLOW_LINKS)?path:path.getParent();
        if(dir==null || !Files.isDirectory(dir,LinkOption.NOFOLLOW_LINKS))throw new IOException("Package directory unavailable.");
        Map<String,byte[]> result=new LinkedHashMap<>();
        try(var entries=Files.list(dir)){
            for(Path entry:entries.sorted().toList()){
                if(!Files.isRegularFile(entry,LinkOption.NOFOLLOW_LINKS))throw new IOException("Non-regular package entry.");
                if(Files.size(entry)>ContentPackageValidator.MAX_FILE_BYTES)throw new IOException("Package file too large.");
                result.put(entry.getFileName().toString(),Files.readAllBytes(entry));
            }
        }
        return result;
    }
    private static int usage(){emit(Map.of("code","USAGE"));return 2;}
    private static void emit(Object value){RESULT.println(JSON.writeValueAsString(value));}
    private static String safe(String s){if(s==null)return "Content operation failed.";String cleaned=s.replaceAll("[^a-zA-Z0-9 .:_-]","?");return cleaned.substring(0,Math.min(cleaned.length(),200));}
}
