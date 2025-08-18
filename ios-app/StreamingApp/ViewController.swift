import UIKit
import AVFoundation

class ViewController: UIViewController {
    
    // MARK: - IBOutlets
    @IBOutlet weak var previewView: UIView!
    @IBOutlet weak var startStopButton: UIButton!
    @IBOutlet weak var fpsSegmentedControl: UISegmentedControl!
    @IBOutlet weak var resolutionSegmentedControl: UISegmentedControl!
    @IBOutlet weak var cameraSegmentedControl: UISegmentedControl!
    @IBOutlet weak var rtmpURLTextField: UITextField!
    @IBOutlet weak var saveURLButton: UIButton!
    @IBOutlet weak var settingsButton: UIButton!
    
    // Filter controls
    @IBOutlet weak var brightnessSlider: UISlider!
    @IBOutlet weak var contrastSlider: UISlider!
    @IBOutlet weak var saturationSlider: UISlider!
    @IBOutlet weak var sharpnessSlider: UISlider!
    
    @IBOutlet weak var statusLabel: UILabel!
    @IBOutlet weak var bitrateLabel: UILabel!
    @IBOutlet weak var fpsLabel: UILabel!
    
    // MARK: - Properties
    private var cameraManager: CameraManager!
    private var videoEncoder: VideoEncoder!
    private var rtmpStreamer: RTMPStreamer!
    private var previewLayer: AVCaptureVideoPreviewLayer?
    
    private var isStreaming = false
    private var streamStartTime: Date?
    private var frameCount = 0
    private var lastFPSUpdate = Date()
    
    // Settings
    private let userDefaults = UserDefaults.standard
    private let rtmpURLKey = "RTMPURLKey"
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupManagers()
        loadSettings()
        requestCameraPermission()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        updateCameraOptions()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = previewView.bounds
    }
    
    // MARK: - Setup
    
    private func setupUI() {
        startStopButton.layer.cornerRadius = 8
        saveURLButton.layer.cornerRadius = 8
        settingsButton.layer.cornerRadius = 8
        
        rtmpURLTextField.layer.cornerRadius = 8
        rtmpURLTextField.layer.borderWidth = 1
        rtmpURLTextField.layer.borderColor = UIColor.systemGray4.cgColor
        rtmpURLTextField.placeholder = "rtmp://server.com/live/streamkey"
        
        setupSliders()
        setupSegmentedControls()
        
        statusLabel.text = "Готов к стримингу"
        bitrateLabel.text = "Битрейт: 0 Mbps"
        fpsLabel.text = "FPS: 0"
        
        updateUI()
    }
    
    private func setupSliders() {
        brightnessSlider.minimumValue = -1.0
        brightnessSlider.maximumValue = 1.0
        brightnessSlider.value = 0.0
        
        contrastSlider.minimumValue = 0.0
        contrastSlider.maximumValue = 2.0
        contrastSlider.value = 1.0
        
        saturationSlider.minimumValue = 0.0
        saturationSlider.maximumValue = 2.0
        saturationSlider.value = 1.0
        
        sharpnessSlider.minimumValue = 0.0
        sharpnessSlider.maximumValue = 2.0
        sharpnessSlider.value = 0.0
    }
    
    private func setupSegmentedControls() {
        fpsSegmentedControl.removeAllSegments()
        fpsSegmentedControl.insertSegment(withTitle: "30", at: 0, animated: false)
        fpsSegmentedControl.insertSegment(withTitle: "60", at: 1, animated: false)
        fpsSegmentedControl.insertSegment(withTitle: "120", at: 2, animated: false)
        fpsSegmentedControl.insertSegment(withTitle: "240", at: 3, animated: false)
        fpsSegmentedControl.selectedSegmentIndex = 0
        
        resolutionSegmentedControl.removeAllSegments()
        resolutionSegmentedControl.insertSegment(withTitle: "720p", at: 0, animated: false)
        resolutionSegmentedControl.insertSegment(withTitle: "1080p", at: 1, animated: false)
        resolutionSegmentedControl.selectedSegmentIndex = 1
    }
    
    private func setupManagers() {
        cameraManager = CameraManager()
        cameraManager.delegate = self
        
        videoEncoder = VideoEncoder()
        videoEncoder.delegate = self
        
        rtmpStreamer = RTMPStreamer()
        rtmpStreamer.delegate = self
    }
    
    private func loadSettings() {
        if let savedURL = userDefaults.string(forKey: rtmpURLKey) {
            rtmpURLTextField.text = savedURL
        }
    }
    
    private func requestCameraPermission() {
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            DispatchQueue.main.async {
                if granted {
                    self?.setupCamera()
                } else {
                    self?.showPermissionAlert()
                }
            }
        }
    }
    
    private func setupCamera() {
        cameraManager.setupCamera()
        setupPreviewLayer()
    }
    
    private func setupPreviewLayer() {
        guard let session = cameraManager.captureSession else { return }
        
        previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer?.videoGravity = .resizeAspectFill
        previewLayer?.frame = previewView.bounds
        
        if let previewLayer = previewLayer {
            previewView.layer.insertSublayer(previewLayer, at: 0)
        }
    }
    
    private func updateCameraOptions() {
        let availableFPS = cameraManager.getAvailableFPS()
        
        fpsSegmentedControl.removeAllSegments()
        for (index, fps) in availableFPS.enumerated() {
            fpsSegmentedControl.insertSegment(withTitle: "\(fps)", at: index, animated: false)
        }
        
        if !availableFPS.isEmpty {
            fpsSegmentedControl.selectedSegmentIndex = 0
        }
    }
    
    // MARK: - Actions
    
    @IBAction func startStopButtonTapped(_ sender: UIButton) {
        if isStreaming {
            stopStreaming()
        } else {
            startStreaming()
        }
    }
    
    @IBAction func saveURLButtonTapped(_ sender: UIButton) {
        guard let url = rtmpURLTextField.text, !url.isEmpty else {
            showAlert(title: "Ошибка", message: "Введите RTMP URL")
            return
        }
        
        userDefaults.set(url, forKey: rtmpURLKey)
        showAlert(title: "Успех", message: "URL сохранен")
    }
    
    private func startStreaming() {
        guard let rtmpURL = rtmpURLTextField.text, !rtmpURL.isEmpty else {
            showAlert(title: "Ошибка", message: "Введите RTMP URL")
            return
        }
        
        videoEncoder.configure()
        rtmpStreamer.configure(rtmpURL: rtmpURL)
        cameraManager.startCapture()
        rtmpStreamer.connect()
        
        isStreaming = true
        streamStartTime = Date()
        frameCount = 0
        lastFPSUpdate = Date()
        
        updateUI()
    }
    
    private func stopStreaming() {
        cameraManager.stopCapture()
        rtmpStreamer.disconnect()
        videoEncoder.invalidate()
        
        isStreaming = false
        streamStartTime = nil
        
        updateUI()
    }
    
    private func updateUI() {
        startStopButton.setTitle(isStreaming ? "Остановить" : "Начать стрим", for: .normal)
        startStopButton.backgroundColor = isStreaming ? .systemRed : .systemGreen
        
        fpsSegmentedControl.isEnabled = !isStreaming
        resolutionSegmentedControl.isEnabled = !isStreaming
        cameraSegmentedControl.isEnabled = !isStreaming
        
        if !isStreaming {
            statusLabel.text = "Готов к стримингу"
            bitrateLabel.text = "Битрейт: 0 Mbps"
            fpsLabel.text = "FPS: 0"
        }
    }
    
    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    private func showPermissionAlert() {
        let alert = UIAlertController(
            title: "Доступ к камере",
            message: "Для работы приложения необходим доступ к камере.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Настройки", style: .default) { _ in
            if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsURL)
            }
        })
        
        alert.addAction(UIAlertAction(title: "Отмена", style: .cancel))
        present(alert, animated: true)
    }
}

// MARK: - CameraManagerDelegate

extension ViewController: CameraManagerDelegate {
    func cameraManager(_ manager: CameraManager, didOutput sampleBuffer: CMSampleBuffer) {
        guard isStreaming, let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        let timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        videoEncoder.encodeFrame(pixelBuffer, presentationTimeStamp: timestamp)
        
        DispatchQueue.main.async {
            self.frameCount += 1
        }
    }
    
    func cameraManager(_ manager: CameraManager, didFailWithError error: Error) {
        DispatchQueue.main.async {
            self.showAlert(title: "Ошибка камеры", message: error.localizedDescription)
        }
    }
}

// MARK: - VideoEncoderDelegate

extension ViewController: VideoEncoderDelegate {
    func videoEncoder(_ encoder: VideoEncoder, didEncodeFrame data: Data, isKeyFrame: Bool, timestamp: CMTime) {
        rtmpStreamer.sendVideoData(data, isKeyFrame: isKeyFrame, timestamp: timestamp)
    }
    
    func videoEncoder(_ encoder: VideoEncoder, didFailWithError error: Error) {
        DispatchQueue.main.async {
            self.showAlert(title: "Ошибка кодирования", message: error.localizedDescription)
            self.stopStreaming()
        }
    }
}

// MARK: - RTMPStreamerDelegate

extension ViewController: RTMPStreamerDelegate {
    func rtmpStreamer(_ streamer: RTMPStreamer, didChangeState state: RTMPStreamer.State) {
        DispatchQueue.main.async {
            switch state {
            case .disconnected:
                self.statusLabel.text = "Отключен"
            case .connecting:
                self.statusLabel.text = "Подключение..."
            case .connected:
                self.statusLabel.text = "Подключен"
            case .streaming:
                self.statusLabel.text = "Стриминг"
            case .error:
                self.statusLabel.text = "Ошибка подключения"
            }
        }
    }
    
    func rtmpStreamer(_ streamer: RTMPStreamer, didFailWithError error: Error) {
        DispatchQueue.main.async {
            self.showAlert(title: "Ошибка стриминга", message: error.localizedDescription)
            self.stopStreaming()
        }
    }
}
