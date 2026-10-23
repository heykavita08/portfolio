// vidtool — tiny AVFoundation helper (no third-party binaries).
//   vidtool info   <in>
//   vidtool frame  <in> <seconds> <out.png>
//   vidtool encode <in> <out.mp4> <width> <kbps> [audio]
import AVFoundation
import AppKit
import CoreImage

func fail(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(1) }

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: vidtool info|frame|encode ...") }
let cmd = args[1]
let asset = AVURLAsset(url: URL(fileURLWithPath: args[2]))

func videoTrack() async throws -> AVAssetTrack {
  guard let t = try await asset.loadTracks(withMediaType: .video).first else { fail("no video track") }
  return t
}


func lumaGrid(_ px: CVPixelBuffer, _ n: Int = 32) -> [Double] {
  CVPixelBufferLockBaseAddress(px, .readOnly); defer { CVPixelBufferUnlockBaseAddress(px, .readOnly) }
  let w = CVPixelBufferGetWidth(px), h = CVPixelBufferGetHeight(px), bpr = CVPixelBufferGetBytesPerRow(px)
  let base = CVPixelBufferGetBaseAddress(px)!.assumingMemoryBound(to: UInt8.self)
  var g = [Double](repeating: 0, count: n * n)
  for gy in 0..<n { for gx in 0..<n {
    let x = (gx * 2 + 1) * w / (n * 2), y = (gy * 2 + 1) * h / (n * 2), i = y * bpr + x * 4
    g[gy * n + gx] = 0.114 * Double(base[i]) + 0.587 * Double(base[i+1]) + 0.299 * Double(base[i+2])
  } }
  return g
}
func mad(_ a: [Double], _ b: [Double]) -> Double { zip(a, b).reduce(0) { $0 + abs($1.0 - $1.1) } / Double(a.count) }

let sem = DispatchSemaphore(value: 0)
Task {
  do {
    switch cmd {
    case "info":
      let t = try await videoTrack()
      let size = try await t.load(.naturalSize)
      let fps = try await t.load(.nominalFrameRate)
      let dur = try await asset.load(.duration).seconds
      let audio = try await asset.loadTracks(withMediaType: .audio).count
      print("\(Int(size.width))x\(Int(size.height)) \(String(format: "%.1f", fps))fps \(String(format: "%.1f", dur))s audioTracks=\(audio)")

    case "frame":
      let gen = AVAssetImageGenerator(asset: asset)
      gen.appliesPreferredTrackTransform = true
      gen.requestedTimeToleranceBefore = .zero
      gen.requestedTimeToleranceAfter = .zero
      let (cg, _) = try await gen.image(at: CMTime(seconds: Double(args[3])!, preferredTimescale: 600))
      let rep = NSBitmapImageRep(cgImage: cg)
      try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[4]))

    case "encode":
      // vidtool encode <in> <out.mp4> <width> <kbps> [audio]
      // Output: constant 30fps, first frame at t=0, last frame held for one frame.
      let out = URL(fileURLWithPath: args[3])
      let targetW = Int(args[4])!
      let kbps = Int(args[5])!
      // Extra options: audio | cut=<mad> | fade=<frames> | end=<seconds> | even=<fps>
      //   even=<fps>: ignore the source timestamps and show every captured frame for exactly one tick at
      //   <fps>. For screen recordings of playing video with uneven capture (freezes, dropped ticks).
      var keepAudio = false, cutThreshold = 0.0, fadeFrames = 9, endAt = Double.infinity
      var evenFps: Double? = nil
      for opt in args.dropFirst(6) {
        let kv = opt.split(separator: "=", maxSplits: 1).map(String.init)
        switch kv[0] {
        case "audio": keepAudio = true
        case "cut": cutThreshold = Double(kv[1])!
        case "fade": fadeFrames = Int(kv[1])!
        case "end": endAt = Double(kv[1])!
        case "even": evenFps = Double(kv[1])!
        default: fail("unknown option \(opt)")
        }
      }
      let fps = evenFps ?? 30.0
      let t = try await videoTrack()
      let natural = try await t.load(.naturalSize)
      let outW = targetW / 2 * 2
      let outH = Int((Double(targetW) * natural.height / natural.width).rounded()) / 2 * 2

      try? FileManager.default.removeItem(at: out)
      let reader = try AVAssetReader(asset: asset)
      let vOut = AVAssetReaderTrackOutput(track: t, outputSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: outW,
        kCVPixelBufferHeightKey as String: outH,
      ])
      reader.add(vOut)

      let writer = try AVAssetWriter(outputURL: out, fileType: .mp4)
      writer.shouldOptimizeForNetworkUse = true
      let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: outW,
        AVVideoHeightKey: outH,
        AVVideoCompressionPropertiesKey: [
          AVVideoAverageBitRateKey: kbps * 1000,
          AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
          AVVideoMaxKeyFrameIntervalKey: 60,
          AVVideoExpectedSourceFrameRateKey: Int(fps),
          AVVideoAllowFrameReorderingKey: false, // no B-frames → no edit list, frame 0 at t=0
        ],
      ])
      vIn.expectsMediaDataInRealTime = false
      let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: outW,
        kCVPixelBufferHeightKey as String: outH,
      ])
      // No colour management: blended frames must match untouched frames bit for bit.
      let ci = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull(), .cacheIntermediates: false])
      writer.add(vIn)

      var aOut: AVAssetReaderTrackOutput?
      var aIn: AVAssetWriterInput?
      if keepAudio, let at = try await asset.loadTracks(withMediaType: .audio).first {
        let o = AVAssetReaderTrackOutput(track: at, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
        reader.add(o); aOut = o
        let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [
          AVFormatIDKey: kAudioFormatMPEG4AAC,
          AVNumberOfChannelsKey: 2,
          AVSampleRateKey: 44100,
          AVEncoderBitRateKey: 128000,
        ])
        i.expectsMediaDataInRealTime = false
        writer.add(i); aIn = i
      }

      reader.startReading()
      writer.startWriting()
      writer.startSession(atSourceTime: .zero)

      // Prime: the first decoded frame defines t=0.
      func nextFrame() -> CMSampleBuffer? {
        while let sb = vOut.copyNextSampleBuffer() {
          if CMSampleBufferGetImageBuffer(sb) != nil { return sb }
        }
        return nil
      }
      guard var current = nextFrame() else { fail("no frames") }
      let offset = CMSampleBufferGetPresentationTimeStamp(current).seconds
      var upcoming = nextFrame()
      var lastSourcePTS = CMSampleBufferGetPresentationTimeStamp(current).seconds
      var k = 0
      var outFrames = 0
      var prevGrid = lumaGrid(CMSampleBufferGetImageBuffer(current)!)
      var lastOut: CIImage? = nil
      var blendFrom: CIImage? = nil
      var blendLeft = 0
      var cuts = 0

      let group = DispatchGroup()
      group.enter()
      vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "v")) {
        while vIn.isReadyForMoreMediaData {
          let tOut = Double(k) / fps
          let tSrc = tOut + offset
          var changed = false
          if evenFps != nil {
            // One source frame per tick, in order.
            if k > 0 {
              guard let u = upcoming, tOut <= endAt else { vIn.markAsFinished(); group.leave(); return }
              current = u
              upcoming = nextFrame()
              changed = true
            }
          } else {
            // Advance to the latest source frame at or before this tick.
            while let u = upcoming, CMSampleBufferGetPresentationTimeStamp(u).seconds <= tSrc + 1e-6 {
              current = u
              lastSourcePTS = CMSampleBufferGetPresentationTimeStamp(u).seconds
              upcoming = nextFrame()
              changed = true
            }
            // Done once the source is exhausted (or the trim point is reached).
            if (upcoming == nil && tSrc > lastSourcePTS + 1.0 / fps) || tSrc > endAt {
              vIn.markAsFinished(); group.leave(); return
            }
          }
          let px = CMSampleBufferGetImageBuffer(current)!
          // Hard cut? Dissolve from what was last shown into the new frame.
          if changed && cutThreshold > 0 {
            let g = lumaGrid(px)
            if mad(prevGrid, g) >= cutThreshold, let from = lastOut { blendFrom = from; blendLeft = fadeFrames; cuts += 1 }
            prevGrid = g
          }
          let time = CMTime(value: CMTimeValue(k), timescale: CMTimeScale(fps))
          let target = CIImage(cvPixelBuffer: px)
          if blendLeft > 0, let from = blendFrom {
            let p = 1 - Double(blendLeft) / Double(fadeFrames + 1)
            let eased = p * p * (3 - 2 * p)
            let img = from.applyingFilter("CIDissolveTransition", parameters: ["inputTargetImage": target, "inputTime": eased]).cropped(to: target.extent)
            var outPx: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &outPx)
            ci.render(img, to: outPx!)
            adaptor.append(outPx!, withPresentationTime: time)
            lastOut = img // keep the expression, not the pooled buffer (it gets recycled)
            blendLeft -= 1
          } else {
            adaptor.append(px, withPresentationTime: time)
            lastOut = target
          }
          k += 1; outFrames += 1
        }
      }

      if let i = aIn, let o = aOut {
        group.enter()
        i.requestMediaDataWhenReady(on: DispatchQueue(label: "a")) {
          while i.isReadyForMoreMediaData {
            guard let sb = o.copyNextSampleBuffer() else { i.markAsFinished(); group.leave(); return }
            let pts = CMSampleBufferGetPresentationTimeStamp(sb)
            let shifted = CMTimeSubtract(pts, CMTime(seconds: offset, preferredTimescale: pts.timescale))
            if shifted.seconds < 0 { continue } // drop audio that precedes the first frame
            var timing = CMSampleTimingInfo(duration: CMSampleBufferGetDuration(sb), presentationTimeStamp: shifted, decodeTimeStamp: .invalid)
            var copy: CMSampleBuffer?
            CMSampleBufferCreateCopyWithNewTiming(allocator: nil, sampleBuffer: sb, sampleTimingEntryCount: 1, sampleTimingArray: &timing, sampleBufferOut: &copy)
            if let c = copy { i.append(c) }
          }
        }
      }

      group.wait()
      writer.endSession(atSourceTime: CMTime(value: CMTimeValue(k), timescale: CMTimeScale(fps)))
      await writer.finishWriting()
      if writer.status != .completed { fail("write failed: \(String(describing: writer.error))") }
      let bytes = (try FileManager.default.attributesOfItem(atPath: out.path)[.size] as? Int) ?? 0
      print("\(out.lastPathComponent): \(outW)x\(outH) \(outFrames)f @\(Int(fps))fps, \(cuts) cuts dissolved, \(String(format: "%.2f", Double(bytes) / 1_048_576))MB")

    case "luma":
      // vidtool luma <in> [step]  → mean luminance (0-255) per sampled frame
      let step = args.count > 3 ? Double(args[3])! : 0.1
      let t = try await videoTrack()
      let r = try AVAssetReader(asset: asset)
      let o = AVAssetReaderTrackOutput(track: t, outputSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: 64, kCVPixelBufferHeightKey as String: 64,
      ])
      r.add(o); r.startReading()
      var nextT = 0.0
      var line: [String] = []
      while let sb = o.copyNextSampleBuffer() {
        guard let px = CMSampleBufferGetImageBuffer(sb) else { continue }
        let p = CMSampleBufferGetPresentationTimeStamp(sb).seconds
        if p + 1e-6 < nextT { continue }
        nextT = p + step
        CVPixelBufferLockBaseAddress(px, .readOnly)
        let w = CVPixelBufferGetWidth(px), h = CVPixelBufferGetHeight(px), bpr = CVPixelBufferGetBytesPerRow(px)
        let base = CVPixelBufferGetBaseAddress(px)!.assumingMemoryBound(to: UInt8.self)
        var sum = 0.0
        for y in 0..<h { for x in 0..<w { let i = y * bpr + x * 4
          sum += 0.114 * Double(base[i]) + 0.587 * Double(base[i+1]) + 0.299 * Double(base[i+2]) } }
        CVPixelBufferUnlockBaseAddress(px, .readOnly)
        line.append(String(format: "%.1f:%.0f", p, sum / Double(w * h)))
      }
      print(line.joined(separator: " "))

    case "mad":
      // vidtool mad <in> [minShown] → frame-to-frame mean abs luma difference
      let minShown = args.count > 3 ? Double(args[3])! : 8
      let t = try await videoTrack()
      let r = try AVAssetReader(asset: asset)
      let o = AVAssetReaderTrackOutput(track: t, outputSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: 128, kCVPixelBufferHeightKey as String: 256,
      ])
      r.add(o); r.startReading()
      var prev: [Double]? = nil
      var hits: [String] = []
      while let sb = o.copyNextSampleBuffer() {
        guard let px = CMSampleBufferGetImageBuffer(sb) else { continue }
        let g = lumaGrid(px)
        if let p = prev { let m = mad(p, g); if m >= minShown { hits.append(String(format: "%.1f:%.0f", CMSampleBufferGetPresentationTimeStamp(sb).seconds, m)) } }
        prev = g
      }
      print(hits.joined(separator: " "))

    case "pts":
      // first/last video sample timestamps, gaps > 0.25s, and audio start
      let t = try await videoTrack()
      let r = try AVAssetReader(asset: asset)
      let o = AVAssetReaderTrackOutput(track: t, outputSettings: nil)
      r.add(o); r.startReading()
      var first = -1.0, last = 0.0, prev = -1.0, n = 0, gaps: [String] = []
      while let sb = o.copyNextSampleBuffer() {
        let p = CMSampleBufferGetPresentationTimeStamp(sb).seconds
        if CMSampleBufferGetNumSamples(sb) == 0 { continue }
        if first < 0 { first = p }
        if prev >= 0 && p - prev > 0.25 { gaps.append(String(format: "%.2f→%.2f", prev, p)) }
        prev = p; last = max(last, p); n += 1
      }
      let dur = try await asset.load(.duration).seconds
      var audioStart = "none"
      if let at = try await asset.loadTracks(withMediaType: .audio).first {
        let tr = try await at.load(.timeRange)
        audioStart = String(format: "%.3f..%.3f", tr.start.seconds, tr.end.seconds)
      }
      print(String(format: "frames=%d first=%.3f last=%.3f duration=%.3f", n, first, last, dur), "audio=\(audioStart)", "gaps>0.25s:", gaps.prefix(6).joined(separator: " "), gaps.count > 6 ? "(+\(gaps.count - 6) more)" : "")

    default:
      fail("unknown command")
    }
  } catch {
    fail("error: \(error)")
  }
  sem.signal()
}
sem.wait()
