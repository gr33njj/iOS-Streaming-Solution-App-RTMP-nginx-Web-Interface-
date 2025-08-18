import UIKit
import AVFoundation

class SettingsViewController: UIViewController {
    
    // MARK: - IBOutlets
    
    // Manual Controls
    @IBOutlet weak var manualExposureSwitch: UISwitch!
    @IBOutlet weak var manualISOSwitch: UISwitch!
    @IBOutlet weak var manualWhiteBalanceSwitch: UISwitch!
    @IBOutlet weak var manualFocusSwitch: UISwitch!
    
    // Manual Values
    @IBOutlet weak var exposureDurationSlider: UISlider!
    @IBOutlet weak var isoSlider: UISlider!
    @IBOutlet weak var whiteBalanceTemperatureSlider: UISlider!
    @IBOutlet weak var whiteBalanceTintSlider: UISlider!
    @IBOutlet weak var focusSlider: UISlider!
    @IBOutlet weak var exposureCompensationSlider: UISlider!
    
    // Labels
    @IBOutlet weak var exposureDurationLabel: UILabel!
    @IBOutlet weak var isoLabel: UILabel!
    @IBOutlet weak var temperatureLabel: UILabel!
    @IBOutlet weak var tintLabel: UILabel!
    @IBOutlet weak var focusLabel: UILabel!
    @IBOutlet weak var exposureCompensationLabel: UILabel!
    
    // Encoding Settings
    @IBOutlet weak var bitrateSlider: UISlider!
    @IBOutlet weak var bitrateLabel: UILabel!
    @IBOutlet weak var keyFrameIntervalSlider: UISlider!
    @IBOutlet weak var keyFrameIntervalLabel: UILabel!
    
    // MARK: - Properties
    
    var cameraManager: CameraManager!
    private var currentDevice: AVCaptureDevice? {
        return cameraManager?.videoDevice
    }
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        loadCurrentSettings()
    }
    
    // MARK: - Setup
    
    private func setupUI() {
        title = "Настройки"
        
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            title: "Готово",
            style: .done,
            target: self,
            action: #selector(doneButtonTapped)
        )
        
        setupSliders()
        updateLabels()
    }
    
    private func setupSliders() {
        guard let device = currentDevice else { return }
        
        // Exposure Duration
        exposureDurationSlider.minimumValue = Float(device.activeFormat.minExposureDuration.seconds)
        exposureDurationSlider.maximumValue = Float(device.activeFormat.maxExposureDuration.seconds)
        exposureDurationSlider.value = Float(device.exposureDuration.seconds)
        
        // ISO
        isoSlider.minimumValue = device.activeFormat.minISO
        isoSlider.maximumValue = device.activeFormat.maxISO
        isoSlider.value = device.iso
        
        // White Balance Temperature (2000K to 8000K)
        whiteBalanceTemperatureSlider.minimumValue = 2000
        whiteBalanceTemperatureSlider.maximumValue = 8000
        whiteBalanceTemperatureSlider.value = 5600
        
        // White Balance Tint (-150 to +150)
        whiteBalanceTintSlider.minimumValue = -150
        whiteBalanceTintSlider.maximumValue = 150
        whiteBalanceTintSlider.value = 0
        
        // Focus (0.0 to 1.0)
        focusSlider.minimumValue = 0.0
        focusSlider.maximumValue = 1.0
        focusSlider.value = device.lensPosition
        
        // Exposure Compensation
        exposureCompensationSlider.minimumValue = device.minExposureTargetBias
        exposureCompensationSlider.maximumValue = device.maxExposureTargetBias
        exposureCompensationSlider.value = device.exposureTargetBias
        
        // Bitrate (1-20 Mbps)
        bitrateSlider.minimumValue = 1_000_000
        bitrateSlider.maximumValue = 20_000_000
        bitrateSlider.value = 5_000_000
        
        // Key Frame Interval (1-10 seconds)
        keyFrameIntervalSlider.minimumValue = 30
        keyFrameIntervalSlider.maximumValue = 300
        keyFrameIntervalSlider.value = 60
    }
    
    private func loadCurrentSettings() {
        guard let cameraManager = cameraManager else { return }
        
        manualExposureSwitch.isOn = cameraManager.manualExposureEnabled
        manualISOSwitch.isOn = cameraManager.manualISOEnabled
        manualWhiteBalanceSwitch.isOn = cameraManager.manualWhiteBalanceEnabled
        manualFocusSwitch.isOn = cameraManager.manualFocusEnabled
        
        updateControlsState()
    }
    
    private func updateControlsState() {
        exposureDurationSlider.isEnabled = manualExposureSwitch.isOn
        isoSlider.isEnabled = manualISOSwitch.isOn
        whiteBalanceTemperatureSlider.isEnabled = manualWhiteBalanceSwitch.isOn
        whiteBalanceTintSlider.isEnabled = manualWhiteBalanceSwitch.isOn
        focusSlider.isEnabled = manualFocusSwitch.isOn
    }
    
    private func updateLabels() {
        let exposureDuration = 1.0 / exposureDurationSlider.value
        exposureDurationLabel.text = "Выдержка: 1/\(Int(exposureDuration))"
        
        isoLabel.text = "ISO: \(Int(isoSlider.value))"
        temperatureLabel.text = "Температура: \(Int(whiteBalanceTemperatureSlider.value))K"
        tintLabel.text = "Оттенок: \(Int(whiteBalanceTintSlider.value))"
        focusLabel.text = "Фокус: \(String(format: "%.2f", focusSlider.value))"
        exposureCompensationLabel.text = "Экспокоррекция: \(String(format: "%.1f", exposureCompensationSlider.value))"
        
        let bitrateInMbps = bitrateSlider.value / 1_000_000
        bitrateLabel.text = "Битрейт: \(String(format: "%.1f", bitrateInMbps)) Mbps"
        
        let keyFrameInSeconds = keyFrameIntervalSlider.value / 30.0
        keyFrameIntervalLabel.text = "Ключевые кадры: \(String(format: "%.1f", keyFrameInSeconds)) сек"
    }
    
    @objc private func doneButtonTapped() {
        dismiss(animated: true)
    }
}
