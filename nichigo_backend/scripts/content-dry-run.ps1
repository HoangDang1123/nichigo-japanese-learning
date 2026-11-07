param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $PackagePath
)

$ErrorActionPreference = 'Stop'
$moduleDirectory = Split-Path -Parent $PSScriptRoot
$inputPath = if ([System.IO.Path]::IsPathRooted($PackagePath)) {
    $PackagePath
} else {
    Join-Path (Get-Location).Path $PackagePath
}
$absolutePackagePath = [System.IO.Path]::GetFullPath($inputPath)

Push-Location $moduleDirectory
try {
    & .\mvnw.cmd -q -DskipTests compile dependency:build-classpath '-Dmdep.outputFile=target/content-cli-classpath.txt' 1>$null
    if ($LASTEXITCODE -ne 0) { exit 2 }
    $dependencies = (Get-Content -LiteralPath 'target/content-cli-classpath.txt' -Raw).Trim()
    $classPath = "target/classes;$dependencies"
    & java -cp $classPath com.nichigo.api.contentimport.ContentDryRunCli $absolutePackagePath
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
