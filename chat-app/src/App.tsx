import './index.css'
import KakaoChat from "./KakaoChat"
import React, { useState, useEffect } from 'react';
import RoomList from './RoomList';

const App = () => {
  const [profile, setProfile] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  useEffect(() => {
    const initApp = async () => {
      // 1. 프로필 발급 (없을 경우에만)
      const savedProfile = localStorage.getItem('chat_profile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      } else {
        const res = await fetch('http://localhost:8080/api/profiles/random');
        const newProfile = await res.json();
        localStorage.setItem('chat_profile', JSON.stringify(newProfile));
        setProfile(newProfile);
      }
    };
    initApp();
  }, []);

  if (!profile) return <div className="p-10">프로필 생성 중...</div>;

  return (
    <div className="bg-gray-100 min-h-screen">
      {!selectedRoom ? (
        // 방 목록 화면
        <RoomList onSelectRoom={(room) => setSelectedRoom(room)} />
      ) : (
        // 실제 채팅 화면 (뒤로가기 버튼 추가 권장)
        <div>
          <KakaoChat
            room={selectedRoom}
            profile={profile}
            onExit={() => setSelectedRoom(null)}
          />
        </div>
      )}
    </div>
  );
};

export default App;