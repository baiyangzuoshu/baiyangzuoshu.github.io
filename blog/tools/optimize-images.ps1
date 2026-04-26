param(
  [string]$RootDir = "source"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $projectRoot

if (-not (Test-Path $RootDir -PathType Container)) {
  Write-Error "Directory not found: $RootDir"
}

function Get-EnvOrDefault {
  param(
    [string]$Name,
    [string]$DefaultValue
  )

  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $DefaultValue
  }

  return $value
}

$jpegQuality = [int](Get-EnvOrDefault -Name "JPEG_QUALITY" -DefaultValue "75")
$largeJpegQuality = [int](Get-EnvOrDefault -Name "LARGE_JPEG_QUALITY" -DefaultValue "72")
$jpegSecondPassQuality = [int](Get-EnvOrDefault -Name "JPEG_SECOND_PASS_QUALITY" -DefaultValue "68")
$jpegSecondPassMinSize = [int](Get-EnvOrDefault -Name "JPEG_SECOND_PASS_MIN_SIZE" -DefaultValue "350000")
$maxJpegEdge = [int](Get-EnvOrDefault -Name "MAX_JPEG_EDGE" -DefaultValue "1800")
$pngQuality = Get-EnvOrDefault -Name "PNG_QUALITY" -DefaultValue "65-80"
$gifFps = [int](Get-EnvOrDefault -Name "GIF_FPS" -DefaultValue "8")
$gifMaxWidth = [int](Get-EnvOrDefault -Name "GIF_MAX_WIDTH" -DefaultValue "560")
$gifMediumWidth = [int](Get-EnvOrDefault -Name "GIF_MEDIUM_WIDTH" -DefaultValue "480")
$webpQuality = [int](Get-EnvOrDefault -Name "WEBP_QUALITY" -DefaultValue "80")

$countJpg = 0
$countPng = 0
$countGif = 0
$countWebp = 0
$savedJpg = 0
$savedPng = 0
$savedGif = 0
$savedWebp = 0

Add-Type -AssemblyName System.Drawing

function New-TempPath {
  param(
    [string]$Prefix,
    [string]$Extension = ""
  )

  Join-Path $env:TEMP ("{0}.{1}{2}" -f $Prefix, [guid]::NewGuid().ToString("N"), $Extension)
}

function Get-FileSize {
  param([string]$Path)
  (Get-Item -LiteralPath $Path).Length
}

function Get-ImageDimensions {
  param([string]$Path)

  $image = [System.Drawing.Image]::FromFile($Path)
  try {
    return @{
      Width = $image.Width
      Height = $image.Height
      HorizontalResolution = $image.HorizontalResolution
      VerticalResolution = $image.VerticalResolution
    }
  }
  finally {
    $image.Dispose()
  }
}

function Get-JpegCodec {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
}

$jpegCodec = Get-JpegCodec

function Save-Jpeg {
  param(
    [string]$SourcePath,
    [string]$DestinationPath,
    [int]$Quality,
    [int]$MaxEdge
  )

  $image = [System.Drawing.Image]::FromFile($SourcePath)
  $bitmap = $null
  $graphics = $null
  $encoderParams = $null
  $encoderParam = $null

  try {
    $width = $image.Width
    $height = $image.Height
    $maxDim = [Math]::Max($width, $height)
    $targetWidth = $width
    $targetHeight = $height

    if ($maxDim -gt $MaxEdge) {
      if ($width -ge $height) {
        $targetWidth = $MaxEdge
        $targetHeight = [int][Math]::Round($height * $MaxEdge / $width)
      }
      else {
        $targetHeight = $MaxEdge
        $targetWidth = [int][Math]::Round($width * $MaxEdge / $height)
      }
    }

    $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)

    if ($image.HorizontalResolution -gt 0 -and $image.VerticalResolution -gt 0) {
      $bitmap.SetResolution($image.HorizontalResolution, $image.VerticalResolution)
    }

    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($image, 0, 0, $targetWidth, $targetHeight)

    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParam = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
    $encoderParams.Param[0] = $encoderParam
    $bitmap.Save($DestinationPath, $jpegCodec, $encoderParams)
  }
  finally {
    if ($encoderParam) { $encoderParam.Dispose() }
    if ($encoderParams) { $encoderParams.Dispose() }
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    if ($image) { $image.Dispose() }
  }
}

function Optimize-Jpg {
  param([string]$Path)

  $oldSize = Get-FileSize $Path
  $dimensions = Get-ImageDimensions $Path
  $maxDim = [Math]::Max($dimensions.Width, $dimensions.Height)
  $quality = $jpegQuality
  $bestTmp = $null

  if ($maxDim -gt $maxJpegEdge -or $oldSize -gt 800000) {
    $quality = $largeJpegQuality
  }

  $tmp = New-TempPath -Prefix "optimize-jpg" -Extension ".jpg"
  $bestTmp = $tmp

  try {
    Save-Jpeg -SourcePath $Path -DestinationPath $bestTmp -Quality $quality -MaxEdge $maxJpegEdge
    $bestSize = Get-FileSize $bestTmp

    if ($bestSize -ge $oldSize -and $oldSize -ge $jpegSecondPassMinSize) {
      $retryTmp = New-TempPath -Prefix "optimize-jpg-retry" -Extension ".jpg"
      Save-Jpeg -SourcePath $Path -DestinationPath $retryTmp -Quality $jpegSecondPassQuality -MaxEdge $maxJpegEdge
      $retrySize = Get-FileSize $retryTmp

      if ($retrySize -lt $bestSize) {
        if (Test-Path $bestTmp) {
          Remove-Item -Force -LiteralPath $bestTmp
        }
        $bestTmp = $retryTmp
        $bestSize = $retrySize
      }
      else {
        Remove-Item -Force -LiteralPath $retryTmp
      }
    }

    if ($bestSize -lt $oldSize) {
      Move-Item -Force -LiteralPath $bestTmp -Destination $Path
      $script:countJpg++
      $script:savedJpg += ($oldSize - $bestSize)
      Write-Host "jpg  $Path  $oldSize -> $bestSize"
    }
    else {
      Remove-Item -Force -LiteralPath $bestTmp
    }
  }
  finally {
    if ($bestTmp -and (Test-Path $bestTmp)) {
      Remove-Item -Force -LiteralPath $bestTmp
    }
  }
}

function Optimize-Png {
  param([string]$Path)

  $pngquant = Get-Command pngquant -ErrorAction SilentlyContinue
  if (-not $pngquant) {
    return
  }

  $oldSize = Get-FileSize $Path
  $tmp = New-TempPath -Prefix "optimize-png" -Extension ".png"

  try {
    & $pngquant.Source "--quality=$pngQuality" --speed 1 --output $tmp --force $Path *> $null

    if ($LASTEXITCODE -eq 0 -and (Test-Path $tmp)) {
      $newSize = Get-FileSize $tmp
      if ($newSize -lt $oldSize) {
        Move-Item -Force -LiteralPath $tmp -Destination $Path
        $script:countPng++
        $script:savedPng += ($oldSize - $newSize)
        Write-Host "png  $Path  $oldSize -> $newSize"
      }
    }
  }
  finally {
    if (Test-Path $tmp) {
      Remove-Item -Force -LiteralPath $tmp
    }
  }
}

function Optimize-Gif {
  param([string]$Path)

  $ffprobe = Get-Command ffprobe -ErrorAction SilentlyContinue
  $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if (-not $ffprobe -or -not $ffmpeg) {
    return
  }

  $oldSize = Get-FileSize $Path
  $width = (& $ffprobe.Source -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 $Path 2>$null).Trim()
  if (-not $width) {
    return
  }

  $targetWidth = [int]$width
  if ($targetWidth -gt $gifMaxWidth) {
    $targetWidth = $gifMaxWidth
  }
  elseif ($targetWidth -gt $gifMediumWidth) {
    $targetWidth = $gifMediumWidth
  }

  $tmp = New-TempPath -Prefix "optimize-gif" -Extension ".gif"
  $palette = New-TempPath -Prefix "optimize-gif-palette" -Extension ".png"

  try {
    & $ffmpeg.Source -nostdin -y -i $Path -vf "fps=$gifFps,scale=$targetWidth:-1:flags=lanczos,palettegen=max_colors=96:reserve_transparent=on" $palette *> $null
    if ($LASTEXITCODE -ne 0) {
      return
    }

    & $ffmpeg.Source -nostdin -y -i $Path -i $palette -lavfi "fps=$gifFps,scale=$targetWidth:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" $tmp *> $null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tmp)) {
      return
    }

    $newSize = Get-FileSize $tmp
    if ($newSize -lt $oldSize) {
      Move-Item -Force -LiteralPath $tmp -Destination $Path
      $script:countGif++
      $script:savedGif += ($oldSize - $newSize)
      Write-Host "gif  $Path  $oldSize -> $newSize"
    }
  }
  finally {
    if (Test-Path $tmp) {
      Remove-Item -Force -LiteralPath $tmp
    }
    if (Test-Path $palette) {
      Remove-Item -Force -LiteralPath $palette
    }
  }
}

function Optimize-Webp {
  param([string]$Path)

  $cwebp = Get-Command cwebp -ErrorAction SilentlyContinue
  if (-not $cwebp) {
    return
  }

  $oldSize = Get-FileSize $Path
  $tmp = New-TempPath -Prefix "optimize-webp" -Extension ".webp"

  try {
    & $cwebp.Source -quiet -q $webpQuality $Path -o $tmp *> $null
    if ($LASTEXITCODE -eq 0 -and (Test-Path $tmp)) {
      $newSize = Get-FileSize $tmp
      if ($newSize -lt $oldSize) {
        Move-Item -Force -LiteralPath $tmp -Destination $Path
        $script:countWebp++
        $script:savedWebp += ($oldSize - $newSize)
        Write-Host "webp $Path  $oldSize -> $newSize"
      }
    }
  }
  finally {
    if (Test-Path $tmp) {
      Remove-Item -Force -LiteralPath $tmp
    }
  }
}

Get-ChildItem -LiteralPath $RootDir -Recurse -File -Include *.jpg, *.jpeg | ForEach-Object {
  Optimize-Jpg $_.FullName
}

Get-ChildItem -LiteralPath $RootDir -Recurse -File -Include *.png | ForEach-Object {
  Optimize-Png $_.FullName
}

Get-ChildItem -LiteralPath $RootDir -Recurse -File -Include *.gif | ForEach-Object {
  Optimize-Gif $_.FullName
}

Get-ChildItem -LiteralPath $RootDir -Recurse -File -Include *.webp | ForEach-Object {
  Optimize-Webp $_.FullName
}

Write-Host ("SUMMARY jpg:{0} saved:{1} png:{2} saved:{3} gif:{4} saved:{5} webp:{6} saved:{7}" -f `
  $countJpg, $savedJpg, $countPng, $savedPng, $countGif, $savedGif, $countWebp, $savedWebp)
