import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';  // Use custom hook instead
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Settings, MessageCircle, Users, Copy, ExternalLink, User, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';

const VideoConsultation = ({ roomName, displayName, onEndCall, consultationId }) => {
  const { t } = useLanguage();  // Use custom hook instead
  const jitsiContainerRef = useRef(null);
  const [api, setApi] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    // Hide instructions after 10 seconds
    const timer = setTimeout(() => {
      setShowInstructions(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!window.JitsiMeetExternalAPI) {
      // Load Jitsi Meet API script
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initializeJitsi;
      script.onerror = () => {
        toast.error(t('videoConsult.loadError') || 'Failed to load video service');
      };
      document.head.appendChild(script);
    } else {
      initializeJitsi();
    }

    return () => {
      if (api) {
        api.dispose();
      }
    };
  }, []);

  const initializeJitsi = () => {
    const domain = 'meet.jit.si';
    const finalRoomName = roomName || `chikitsak-${Date.now()}`;
    
    const options = {
      roomName: finalRoomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: displayName || t('videoConsult.defaultPatientName') || 'Patient'
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
        disableModeratorIndicator: true,
        startScreenSharing: false,
        enableEmailInStats: false,
        enableClosePage: false,
        resolution: 720,
        constraints: {
          video: {
            aspectRatio: 16 / 9,
            height: {
              ideal: 720,
              max: 720,
              min: 180
            }
          }
        },
        toolbarButtons: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
          'settings', 'raisehand', 'videoquality', 'filmstrip', 'invite', 
          'feedback', 'stats', 'shortcuts', 'tileview', 'help'
        ]
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_POWERED_BY: false,
        DISPLAY_WELCOME_PAGE_CONTENT: false,
        DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
        APP_NAME: t('app.title') || 'Chikitsak Telemedicine',
        NATIVE_APP_NAME: 'Chikitsak',
        DEFAULT_BACKGROUND: '#1e3a8a',
        TOOLBAR_TIMEOUT: 4000,
        INITIAL_TOOLBAR_TIMEOUT: 20000,
        TOOLBAR_ALWAYS_VISIBLE: false,
        DEFAULT_REMOTE_DISPLAY_NAME: t('videoConsult.doctorLabel') || 'Doctor',
        DEFAULT_LOCAL_DISPLAY_NAME: t('videoConsult.youLabel') || 'You',
        LANG_DETECTION: true,
        DISABLE_VIDEO_QUALITY_LABEL: false,
        VIDEO_QUALITY_LABEL_DISABLED: false
      }
    };

    const jitsiAPI = new window.JitsiMeetExternalAPI(domain, options);
    setApi(jitsiAPI);

    // Event listeners
    jitsiAPI.addEventListener('videoConferenceJoined', () => {
      setIsConnected(true);
      toast.success(t('videoConsult.joinedSuccessfully') || 'Joined consultation successfully');
      console.log('Joined video conference');
    });

    jitsiAPI.addEventListener('videoConferenceLeft', () => {
      setIsConnected(false);
      if (onEndCall) onEndCall();
    });

    jitsiAPI.addEventListener('participantJoined', () => {
      jitsiAPI.executeCommand('getParticipantsInfo').then(participants => {
        setParticipantCount(participants.length);
      });
    });

    jitsiAPI.addEventListener('participantLeft', () => {
      jitsiAPI.executeCommand('getParticipantsInfo').then(participants => {
        setParticipantCount(participants.length);
      });
    });

    jitsiAPI.addEventListener('audioMuteStatusChanged', (event) => {
      setIsAudioOn(!event.muted);
    });

    jitsiAPI.addEventListener('videoMuteStatusChanged', (event) => {
      setIsVideoOn(!event.muted);
    });

    jitsiAPI.addEventListener('readyToClose', () => {
      if (onEndCall) onEndCall();
    });

    jitsiAPI.addEventListener('incomingMessage', (event) => {
      setChatMessages(prev => [...prev, {
        from: event.from,
        message: event.message,
        timestamp: new Date()
      }]);
    });
  };

  const toggleVideo = () => {
    if (api) {
      api.executeCommand('toggleVideo');
    }
  };

  const toggleAudio = () => {
    if (api) {
      api.executeCommand('toggleAudio');
    }
  };

  const endCall = () => {
    if (api) {
      api.executeCommand('hangup');
    }
  };

  const shareRoom = async () => {
    const roomUrl = `https://meet.jit.si/${roomName || 'telemedicine-consultation'}`;
    try {
      await navigator.clipboard.writeText(roomUrl);
      toast.success(t('videoConsult.linkCopied') || 'Room link copied to clipboard');
    } catch (err) {
      toast.error(t('videoConsult.copyFailed') || 'Failed to copy link');
    }
  };

  const openInNewTab = () => {
    const roomUrl = `https://meet.jit.si/${roomName || 'telemedicine-consultation'}`;
    window.open(roomUrl, '_blank');
  };

  // Check if this is an instant consultation (no consultationId provided)
  const isInstantConsultation = !consultationId;

  return (
    <div className="h-screen bg-gray-900 relative">
      {/* Jitsi Meet Container */}
      <div ref={jitsiContainerRef} className="w-full h-full" />

      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-8 text-center max-w-md mx-4"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold mb-2">
              {t('videoConsult.connecting') || 'Connecting...'}
            </h3>
            <p className="text-gray-600">
              {t('videoConsult.pleaseWait') || 'Please wait while we connect you to the consultation'}
            </p>
            
            {/* Room sharing options while connecting */}
            <div className="mt-6 space-y-3">
              <div className="text-sm font-medium text-gray-800">
                {t('videoConsult.shareRoom') || 'Share this room with doctor:'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={shareRoom}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  {t('videoConsult.copyLink') || 'Copy Link'}
                </button>
                <button
                  onClick={openInNewTab}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
              
              {/* Instant consultation info */}
              {isInstantConsultation && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="text-blue-600" size={16} />
                    <span className="font-medium text-blue-800">
                      {t('videoConsult.instantConsultation') || 'Instant Consultation'}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {t('videoConsult.doctorCanJoin') || 'Your doctor can join this consultation by visiting the same link. No booking required.'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Enhanced Control Bar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 rounded-full px-6 py-3 flex items-center gap-4 backdrop-blur-sm">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            isAudioOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          title={isAudioOn ? t('videoConsult.muteAudio') : t('videoConsult.unmuteAudio')}
        >
          {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            isVideoOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          title={isVideoOn ? t('videoConsult.turnOffVideo') : t('videoConsult.turnOnVideo')}
        >
          {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Participant count */}
        {participantCount > 0 && (
          <div className="flex items-center gap-1 px-3 py-2 bg-gray-700 rounded-full text-white text-sm">
            <Users size={16} />
            <span>{participantCount}</span>
          </div>
        )}

        <button
          onClick={shareRoom}
          className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          title={t('videoConsult.shareRoom') || 'Share Room'}
        >
          <Copy size={20} />
        </button>

        <button
          onClick={endCall}
          className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
          title={t('videoConsult.endCall') || 'End Call'}
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {/* Instructions for Rural Users */}
      {showInstructions && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg max-w-xs backdrop-blur-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold">{t('videoConsult.instructions') || 'Instructions'}:</h4>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-gray-300 hover:text-white ml-2"
            >
              ×
            </button>
          </div>
          <ul className="text-sm space-y-1">
            <li>• {t('videoConsult.micButton') || 'Mic button: Turn audio on/off'}</li>
            <li>• {t('videoConsult.cameraButton') || 'Camera button: Turn video on/off'}</li>
            <li>• {t('videoConsult.redButton') || 'Red button: End call'}</li>
            <li>• {t('videoConsult.chatLocation') || 'Look for chat button in toolbar'}</li>
            <li>• {t('videoConsult.shareButton') || 'Blue button: Share room link'}</li>
            {isInstantConsultation && (
              <li>• {t('videoConsult.doctorJoinInfo') || 'Doctor can join using the same link'}</li>
            )}
          </ul>
        </motion.div>
      )}

      {/* Connection quality indicator */}
      {isConnected && (
        <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
          {t('videoConsult.connected') || 'Connected'}
        </div>
      )}
      
      {/* Instant consultation indicator */}
      {isConnected && isInstantConsultation && (
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
          <Stethoscope size={14} />
          {t('videoConsult.instant') || 'Instant Consultation'}
        </div>
      )}
    </div>
  );
};

export default VideoConsultation;