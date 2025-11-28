# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial MVP release with core desktop sharing functionality
- Local Python signaling server for peer-to-peer connections
- WebRTC-based video and audio streaming
- Multi-user support with connection tracking
- Display selection and switching
- Stream statistics monitoring (bitrate, latency, FPS)
- Error handling and automatic reconnection
- Cross-platform support (Windows, macOS, Linux)

### Changed
- Replaced external signaling server with local Python server
- Updated UI to show IP address and port instead of room codes

### Fixed
- Desktop capture initialization
- Connection cleanup on disconnect

## [0.1.0] - 2024-01-XX

### Added
- Initial MVP release
- Desktop capture at 30+ FPS
- Audio capture and transmission
- WebRTC peer connections
- Connection tracking and management
- Display selector UI
- Stream statistics display
- Error handling and recovery
- Graceful shutdown

### Security
- No external backend required
- All connections are peer-to-peer
- User controls port forwarding

## Future Versions

### [0.2.0] - Planned
- Input device support (mouse, keyboard)
- Recording functionality
- Advanced quality settings
- Performance optimizations
- Bug fixes and stability improvements

### [0.3.0] - Planned
- Web client for remote users
- Mobile app support
- Advanced authentication
- Session management
- Analytics and monitoring

### [1.0.0] - Planned
- Production-ready release
- Full feature parity across platforms
- Comprehensive documentation
- Community support
