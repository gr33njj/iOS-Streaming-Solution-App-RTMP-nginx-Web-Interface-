import VideoToolbox
import AVFoundation
import CoreMedia

protocol VideoEncoderDelegate: AnyObject {
    func videoEncoder(_ encoder: VideoEncoder, didEncodeFrame data: Data, isKeyFrame: Bool, timestamp: CMTime)
    func videoEncoder(_ encoder: VideoEncoder, didFailWithError error: Error)
}

class VideoEncoder {
    weak var delegate: VideoEncoderDelegate?
    
    private var compressionSession: VTCompressionSession?
    private var isConfigured = false
    
    // Настройки кодирования
    var width: Int32 = 1920
    var height: Int32 = 1080
    var fps: Int32 = 30
    var bitrate: Int = 5_000_000 // 5 Mbps
    var keyFrameInterval: Int32 = 60 // 2 секунды при 30 FPS
    
    private let encodingQueue = DispatchQueue(label: "video.encoding.queue")
    
    func configure() {
        encodingQueue.async { [weak self] in
            self?.setupCompressionSession()
        }
    }
    
    private func setupCompressionSession() {
        // Освобождаем предыдущую сессию
        if let session = compressionSession {
            VTCompressionSessionCompleteFrames(session, untilPresentationTimeStamp: .invalid)
            VTCompressionSessionInvalidate(session)
        }
        
        let status = VTCompressionSessionCreate(
            allocator: kCFAllocatorDefault,
            width: width,
            height: height,
            codecType: kCMVideoCodecType_H264,
            encoderSpecification: nil,
            imageBufferAttributes: nil,
            compressedDataAllocator: nil,
            outputCallback: compressionOutputCallback,
            refcon: Unmanaged.passUnretained(self).toOpaque(),
            compressionSessionOut: &compressionSession
        )
        
        guard status == noErr, let session = compressionSession else {
            delegate?.videoEncoder(self, didFailWithError: VideoEncoderError.sessionCreationFailed)
            return
        }
        
        // Настройка параметров кодирования
        configureSessionProperties(session)
        
        // Подготовка сессии к кодированию
        VTCompressionSessionPrepareToEncodeFrames(session)
        isConfigured = true
    }
    
    private func configureSessionProperties(_ session: VTCompressionSession) {
        // Профиль H.264 High
        VTSessionSetProperty(session, kVTCompressionPropertyKey_ProfileLevel, kVTProfileLevel_H264_High_AutoLevel)
        
        // Настройка битрейта (CBR)
        VTSessionSetProperty(session, kVTCompressionPropertyKey_AverageBitRate, CFNumber(value: bitrate))
        VTSessionSetProperty(session, kVTCompressionPropertyKey_DataRateLimits, [bitrate / 8, 1] as CFArray)
        
        // Интервал ключевых кадров
        VTSessionSetProperty(session, kVTCompressionPropertyKey_MaxKeyFrameInterval, CFNumber(value: keyFrameInterval))
        
        // Отключение B-frames для минимальной задержки
        VTSessionSetProperty(session, kVTCompressionPropertyKey_AllowFrameReordering, kCFBooleanFalse)
        
        // Настройка для минимальной задержки
        VTSessionSetProperty(session, kVTCompressionPropertyKey_RealTime, kCFBooleanTrue)
        
        // Настройка энтропийного кодирования
        VTSessionSetProperty(session, kVTCompressionPropertyKey_H264EntropyMode, kVTH264EntropyMode_CABAC)
        
        // Качество кодирования
        VTSessionSetProperty(session, kVTCompressionPropertyKey_Quality, CFNumber(value: 0.7))
        
        // Настройка для стриминга
        VTSessionSetProperty(session, kVTCompressionPropertyKey_ExpectedFrameRate, CFNumber(value: fps))
    }
    
    func encodeFrame(_ pixelBuffer: CVPixelBuffer, presentationTimeStamp: CMTime) {
        guard isConfigured, let session = compressionSession else {
            delegate?.videoEncoder(self, didFailWithError: VideoEncoderError.notConfigured)
            return
        }
        
        encodingQueue.async { [weak self] in
            let status = VTCompressionSessionEncodeFrame(
                session,
                imageBuffer: pixelBuffer,
                presentationTimeStamp: presentationTimeStamp,
                duration: .invalid,
                frameProperties: nil,
                sourceFrameRefcon: nil,
                infoFlagsOut: nil
            )
            
            if status != noErr {
                self?.delegate?.videoEncoder(self!, didFailWithError: VideoEncoderError.encodingFailed)
            }
        }
    }
    
    func updateBitrate(_ newBitrate: Int) {
        guard let session = compressionSession else { return }
        
        bitrate = newBitrate
        VTSessionSetProperty(session, kVTCompressionPropertyKey_AverageBitRate, CFNumber(value: bitrate))
        VTSessionSetProperty(session, kVTCompressionPropertyKey_DataRateLimits, [bitrate, 1] as CFArray)
    }
    
    func invalidate() {
        encodingQueue.async { [weak self] in
            guard let self = self, let session = self.compressionSession else { return }
            
            VTCompressionSessionCompleteFrames(session, untilPresentationTimeStamp: .invalid)
            VTCompressionSessionInvalidate(session)
            self.compressionSession = nil
            self.isConfigured = false
        }
    }
    
    deinit {
        invalidate()
    }
}

// MARK: - Compression Callback

private let compressionOutputCallback: VTCompressionOutputCallback = { (
    outputCallbackRefCon: UnsafeMutableRawPointer?,
    sourceFrameRefCon: UnsafeMutableRawPointer?,
    status: OSStatus,
    infoFlags: VTEncodeInfoFlags,
    sampleBuffer: CMSampleBuffer?
) in
    
    guard status == noErr,
          let sampleBuffer = sampleBuffer,
          let encoder = outputCallbackRefCon?.assumingMemoryBound(to: VideoEncoder.self).pointee else {
        return
    }
    
    // Проверяем, является ли кадр ключевым
    let isKeyFrame = !CFDictionaryContainsKey(
        CMSampleBufferGetSampleAttachmentsArray(sampleBuffer, createIfNecessary: false) as CFDictionary? ?? [:] as CFDictionary,
        kCMSampleAttachmentKey_NotSync
    )
    
    // Получаем данные H.264
    guard let dataBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else { return }
    
    let dataLength = CMBlockBufferGetDataLength(dataBuffer)
    let data = UnsafeMutablePointer<UInt8>.allocate(capacity: dataLength)
    defer { data.deallocate() }
    
    CMBlockBufferCopyDataBytes(dataBuffer, atOffset: 0, dataLength: dataLength, destination: data)
    
    let encodedData = Data(bytes: data, count: dataLength)
    let presentationTimeStamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    
    DispatchQueue.main.async {
        encoder.delegate?.videoEncoder(encoder, didEncodeFrame: encodedData, isKeyFrame: isKeyFrame, timestamp: presentationTimeStamp)
    }
}

enum VideoEncoderError: Error {
    case sessionCreationFailed
    case notConfigured
    case encodingFailed
    case invalidPixelBuffer
}
