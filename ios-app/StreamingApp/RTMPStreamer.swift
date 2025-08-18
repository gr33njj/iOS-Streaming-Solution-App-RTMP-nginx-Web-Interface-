import Foundation
import Network
import AVFoundation

protocol RTMPStreamerDelegate: AnyObject {
    func rtmpStreamer(_ streamer: RTMPStreamer, didChangeState state: RTMPStreamer.State)
    func rtmpStreamer(_ streamer: RTMPStreamer, didFailWithError error: Error)
}

class RTMPStreamer: NSObject {
    
    enum State {
        case disconnected
        case connecting
        case connected
        case streaming
        case error
    }
    
    weak var delegate: RTMPStreamerDelegate?
    
    private var connection: NWConnection?
    private var state: State = .disconnected {
        didSet {
            DispatchQueue.main.async {
                self.delegate?.rtmpStreamer(self, didChangeState: self.state)
            }
        }
    }
    
    private var rtmpURL: URL?
    private var streamKey: String?
    
    private let connectionQueue = DispatchQueue(label: "rtmp.connection.queue")
    private let sendQueue = DispatchQueue(label: "rtmp.send.queue")
    
    // RTMP параметры
    private var chunkSize: UInt32 = 128
    private var messageStreamId: UInt32 = 1
    private var videoTimestamp: UInt32 = 0
    private var audioTimestamp: UInt32 = 0
    
    func configure(rtmpURL: String) {
        guard let url = URL(string: rtmpURL) else {
            delegate?.rtmpStreamer(self, didFailWithError: RTMPError.invalidURL)
            return
        }
        
        // Парсим RTMP URL
        guard let host = url.host,
              let scheme = url.scheme,
              scheme.lowercased() == "rtmp" else {
            delegate?.rtmpStreamer(self, didFailWithError: RTMPError.invalidURL)
            return
        }
        
        let port = url.port ?? 1935
        let pathComponents = url.pathComponents.filter { $0 != "/" }
        
        self.rtmpURL = url
        self.streamKey = pathComponents.last
        
        // Создаем TCP соединение
        let endpoint = NWEndpoint.hostPort(host: NWEndpoint.Host(host), port: NWEndpoint.Port(rawValue: UInt16(port))!)
        let parameters = NWParameters.tcp
        parameters.allowLocalEndpointReuse = true
        
        connection = NWConnection(to: endpoint, using: parameters)
        setupConnectionHandlers()
    }
    
    private func setupConnectionHandlers() {
        guard let connection = connection else { return }
        
        connection.stateUpdateHandler = { [weak self] newState in
            switch newState {
            case .ready:
                self?.state = .connected
                self?.performRTMPHandshake()
            case .failed(let error):
                self?.state = .error
                self?.delegate?.rtmpStreamer(self!, didFailWithError: error)
            case .cancelled:
                self?.state = .disconnected
            default:
                break
            }
        }
        
        connection.start(queue: connectionQueue)
        state = .connecting
    }
    
    func connect() {
        guard state == .disconnected else { return }
        
        connection?.start(queue: connectionQueue)
        state = .connecting
    }
    
    func disconnect() {
        connection?.cancel()
        connection = nil
        state = .disconnected
    }
    
    func sendVideoData(_ data: Data, isKeyFrame: Bool, timestamp: CMTime) {
        guard state == .streaming else { return }
        
        sendQueue.async { [weak self] in
            self?.processVideoData(data, isKeyFrame: isKeyFrame, timestamp: timestamp)
        }
    }
    
    func sendAudioData(_ data: Data, timestamp: CMTime) {
        guard state == .streaming else { return }
        
        sendQueue.async { [weak self] in
            self?.processAudioData(data, timestamp: timestamp)
        }
    }
    
    private func performRTMPHandshake() {
        // Упрощенный RTMP handshake
        var c0c1 = Data()
        c0c1.append(0x03) // RTMP version
        
        // C1 (1536 bytes)
        var c1 = Data(count: 1536)
        let timestamp = UInt32(Date().timeIntervalSince1970)
        c1.replaceSubrange(0..<4, with: withUnsafeBytes(of: timestamp.bigEndian) { Data($0) })
        
        // Random data
        for i in 8..<1536 {
            c1[i] = UInt8.random(in: 0...255)
        }
        
        c0c1.append(c1)
        
        sendData(c0c1) { [weak self] in
            self?.receiveHandshakeResponse(c1: c1)
        }
    }
    
    private func processVideoData(_ data: Data, isKeyFrame: Bool, timestamp: CMTime) {
        // Создаем FLV video tag и отправляем через RTMP
        let timestampMs = UInt32(CMTimeGetSeconds(timestamp) * 1000)
        // Упрощенная реализация для демонстрации
        print("Sending video data: \(data.count) bytes, keyframe: \(isKeyFrame)")
    }
    
    private func processAudioData(_ data: Data, timestamp: CMTime) {
        // Создаем FLV audio tag и отправляем через RTMP
        let timestampMs = UInt32(CMTimeGetSeconds(timestamp) * 1000)
        print("Sending audio data: \(data.count) bytes")
    }
    
    private func sendData(_ data: Data, completion: @escaping () -> Void) {
        guard let connection = connection else {
            completion()
            return
        }
        
        connection.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                self.delegate?.rtmpStreamer(self, didFailWithError: error)
            }
            completion()
        })
    }
}

enum RTMPError: Error {
    case invalidURL
    case handshakeFailed
    case connectionFailed
    case authenticationFailed
}
