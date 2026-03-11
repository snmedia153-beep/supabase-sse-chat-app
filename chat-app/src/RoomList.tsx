import React, { useState, useEffect, useRef } from 'react';

const RoomList = ({ onSelectRoom }: { onSelectRoom: (room: any) => void }) => {
    const [rooms, setRooms] = useState([]);
  
    useEffect(() => {
      fetch('http://localhost:8080/api/chat/rooms')
        .then(res => res.json())
        .then(data => setRooms(data));
    }, []);
  
    return (
      <div className="max-w-md mx-auto bg-white h-screen shadow-lg">
        <header className="p-4 border-b font-bold text-lg">채팅방 목록</header>
        <div className="divide-y">
          {rooms.map((room: any) => (
            <div 
              key={room.id} 
              onClick={() => onSelectRoom(room)}
              className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between"
            >
              <span>{room.title}</span>
              <span className="text-gray-400 text-sm">→</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

export default RoomList;