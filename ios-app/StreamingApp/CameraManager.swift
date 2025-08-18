import AVFoundation
import UIKit
import CoreImage

enum CameraType: String, CaseIterable {
    case wide = "Wide 1x"
    case ultraWide = "UltraWide 0.5x"
    case telephoto2x = "Telephoto 2x"
    case telephoto3x = "Telephoto 3x"
    case front = "Front"
    
    var deviceType: AVCaptureDevice.DeviceType {
        switch self {
        case .wide:
            return .builtInWideAngleCamera
        case .ultraWide:
            return .builtInUltraWideCamera
        case .telephoto2x, .telephoto3x:
            return .builtInTelephotoCamera
        case .front:
            return .builtInTrueDepthCamera
        }
    }
    
    var position: AVCaptureDevice.Position {
        switch self {
        case .front:
            return .front
        default:
            return .back
        }
    }
}

protocol CameraManagerDelegate: AnyObject {
    func cameraManager(_ manager: CameraManager, didOutput sampleBuffer: CMSampleBuffer)
    func cameraManager(_ manager: CameraManager, didFailWithError error: Error)
}

class CameraManager: NSObject {
    weak var delegate: CameraManagerDelegate?
    
    private var captureSession: AVCaptureSession?
    private var videoDevice: AVCaptureDevice?
    private var videoInput: AVCaptureDeviceInput?
    private var videoOutput: AVCaptureVideoDataOutput?
    private var audioDevice: AVCaptureDevice?
    private var audioInput: AVCaptureDeviceInput?
    private var audioOutput: AVCaptureAudioDataOutput?
    
    private let sessionQueue = DispatchQueue(label: "camera.session.queue")
    private let videoQueue = DispatchQueue(label: "camera.video.queue")
    private let audioQueue = DispatchQueue(label: "camera.audio.queue")
    
    // Настройки камеры
    var currentCameraType: CameraType = .wide
    var currentResolution: CGSize = CGSize(width: 1920, height: 1080) // 1080p
    var currentFPS: Int32 = 30
    
    // Ручные настройки
    var manualExposureEnabled = false
    var manualISOEnabled = false
    var manualWhiteBalanceEnabled = false
    var manualFocusEnabled = false
    
    // Фильтры CoreImage
    var brightness: Float = 0.0
    var contrast: Float = 1.0
    var saturation: Float = 1.0
    var sharpness: Float = 0.0
    
    private var ciContext: CIContext?
    
    override init() {
        super.init()
        self.ciContext = CIContext()
    }
    
    func setupCamera() {
        sessionQueue.async { [weak self] in
            self?.configureSession()
        }
    }
    
    private func configureSession() {
        guard captureSession == nil else { return }
        
        let session = AVCaptureSession()
        session.beginConfiguration()
        
        // Настройка качества сессии
        if session.canSetSessionPreset(.high) {
            session.sessionPreset = .high
        }
        
        // Настройка видео устройства
        guard let videoDevice = getVideoDevice(for: currentCameraType) else {
            delegate?.cameraManager(self, didFailWithError: CameraError.deviceNotFound)
            return
        }
        
        do {
            let videoInput = try AVCaptureDeviceInput(device: videoDevice)
            if session.canAddInput(videoInput) {
                session.addInput(videoInput)
                self.videoDevice = videoDevice
                self.videoInput = videoInput
            }
        } catch {
            delegate?.cameraManager(self, didFailWithError: error)
            return
        }
        
        // Настройка аудио устройства
        if let audioDevice = AVCaptureDevice.default(for: .audio) {
            do {
                let audioInput = try AVCaptureDeviceInput(device: audioDevice)
                if session.canAddInput(audioInput) {
                    session.addInput(audioInput)
                    self.audioDevice = audioDevice
                    self.audioInput = audioInput
                }
            } catch {
                print("Audio input error: \(error)")
            }
        }
        
        // Настройка видео выхода
        let videoOutput = AVCaptureVideoDataOutput()
        videoOutput.setSampleBufferDelegate(self, queue: videoQueue)
        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange
        ]
        videoOutput.alwaysDiscardsLateVideoFrames = true
        
        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
            self.videoOutput = videoOutput
        }
        
        // Настройка аудио выхода
        let audioOutput = AVCaptureAudioDataOutput()
        audioOutput.setSampleBufferDelegate(self, queue: audioQueue)
        
        if session.canAddOutput(audioOutput) {
            session.addOutput(audioOutput)
            self.audioOutput = audioOutput
        }
        
        session.commitConfiguration()
        self.captureSession = session
        
        // Настройка параметров камеры
        configureCamera()
    }
    
    func getAvailableFPS() -> [Int32] {
        guard let device = videoDevice else { return [30] }
        
        var availableFPS: Set<Int32> = []
        
        for format in device.formats {
            let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
            if CGFloat(dimensions.width) == currentResolution.width && CGFloat(dimensions.height) == currentResolution.height {
                for range in format.videoSupportedFrameRateRanges {
                    let possibleFPS: [Int32] = [30, 60, 120, 240]
                    for fps in possibleFPS {
                        if range.minFrameRate <= Double(fps) && Double(fps) <= range.maxFrameRate {
                            availableFPS.insert(fps)
                        }
                    }
                }
            }
        }
        
        return Array(availableFPS).sorted()
    }
    
    func startCapture() {
        sessionQueue.async { [weak self] in
            self?.captureSession?.startRunning()
        }
    }
    
    func stopCapture() {
        sessionQueue.async { [weak self] in
            self?.captureSession?.stopRunning()
        }
    }
}

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
    
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        
        if output == videoOutput {
            delegate?.cameraManager(self, didOutput: sampleBuffer)
        } else if output == audioOutput {
            delegate?.cameraManager(self, didOutput: sampleBuffer)
        }
    }
}

enum CameraError: Error {
    case deviceNotFound
    case configurationFailed
    case permissionDenied
}
