param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $ContentArgs
)

$ErrorActionPreference = 'Stop'
$moduleDirectory = Split-Path -Parent $PSScriptRoot
if ($ContentArgs.Count -ge 2 -and $ContentArgs[0] -in @('validate', 'dry-run', 'import')) {
    $candidate = if ([System.IO.Path]::IsPathRooted($ContentArgs[1])) { $ContentArgs[1] } else { Join-Path (Get-Location).Path $ContentArgs[1] }
    $ContentArgs[1] = [System.IO.Path]::GetFullPath($candidate)
}
Push-Location $moduleDirectory
try {
    & .\mvnw.cmd -q -DskipTests compile dependency:build-classpath '-Dmdep.outputFile=target/content-operator-classpath.txt' 1>$null
    if ($LASTEXITCODE -ne 0) { exit 2 }
    $dependencies = (Get-Content -LiteralPath 'target/content-operator-classpath.txt' -Raw).Trim()
    $classPath = "target/classes;$dependencies"
    & java -cp $classPath com.nichigo.api.contentimport.ContentOperatorCli @ContentArgs
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
