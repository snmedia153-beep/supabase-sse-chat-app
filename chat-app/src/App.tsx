import './index.css'
import { API_BASE_URL } from './constants/api';
import KakaoChat from "./KakaoChat"
//import React, { useState, useEffect, useCallback } from 'react';
import { useState, useEffect, useCallback } from 'react';
import RoomList from './RoomList';

const App = () => {
  const [profile, setProfile] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const initApp = useCallback(async () => {
    try {
      setLoading(true);
      const savedProfile = localStorage.getItem('chat_profile');
      
      if (savedProfile) {
        // [Tip] 실제 서비스라면 여기서 서버에 이 ID가 유효한지 체크하는 과정이 필요
        setProfile(JSON.parse(savedProfile));
      } else {
        const res = await fetch(`${API_BASE_URL}/api/profiles/random`);
        if (!res.ok) throw new Error("프로필 생성 실패");
        
        const newProfile = await res.json();
        localStorage.setItem('chat_profile', JSON.stringify(newProfile));
        setProfile(newProfile);
      }
    } catch (error) {
      console.error("초기화 에러:", error);
      // 에러 발생 시 로컬 스토리지를 비우고 다시 시도하게 유도할 수 있습니다.
      localStorage.removeItem('chat_profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initApp();
  }, [initApp]);

  // 방 나가기 핸들러
  const handleExit = () => setSelectedRoom(null);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mx-auto"></div>
        <p className="mt-4 text-gray-500 text-sm">서버 연결 중...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      {!selectedRoom ? (
        <RoomList onSelectRoom={(room) => setSelectedRoom(room)} />
      ) : (
        <KakaoChat
          room={selectedRoom}
          profile={profile}
          onExit={handleExit}
        />
      )}
    </div>
  );
};

export default App;