import React, { useState, useEffect, useRef } from 'react';
// 1. 컴포넌트가 받을 데이터의 규격을 정의합니다.
interface KakaoChatProps {
  room: {
    id: string;
    title: string;
  };
  profile: {
    id: string;
    nickname: string;
  };
  onExit: () => void; // 방 나가기 함수를 부모로부터 받음
}
interface Message {
  id: number;
  senderId: string;
  sender: string;
  content: string;
  time: string;
  isMe: boolean;
  isRead: boolean;
}

//const KakaoChat = () => {
const KakaoChat: React.FC<KakaoChatProps> = ({ room, profile, onExit }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null); // 스크롤을 위한 Ref 생성
  
  // 1. [자동 스크롤] 메시지 목록이 변경될 때마다 하단으로 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]); // messages 상태가 바뀔 때마다 실행

  // 2. [과거 내역] 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/chat/history/${room.id}`);
        if (response.ok) {
          const data = await response.json();
          // 가져온 데이터를 포맷에 맞춰 state에 저장
          setMessages(data.map((m: any) => ({
            id: m.id || Math.random(),
            senderId: m.sender_id || m.senderId, // DB 필드명 대응
            sender: m.profiles?.nickname || '익명',        // 백엔드에서 nickname을 같이 보내줘야 함
            content: m.content,
            time: new Date(m.created_at || m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: String(m.sender_id || m.senderId) === String(profile.id), // ID 비교 강화
            isRead: true
          })));
        }
      } catch (error) {
        console.error("내역 로딩 실패:", error);
      }
    };

    fetchHistory();
  }, [room.id, profile.id]);

  // [수신] SSE 연결 설정
  useEffect(() => {
    const eventSource = new EventSource(`http://localhost:8080/api/chat/subscribe/${room.id}`);

    eventSource.addEventListener("chat", (event) => {
      const newMessage = JSON.parse(event.data);
      console.log("받은 메시지:", newMessage); // 디버깅용 로그
      
      // 서버에서 온 메시지를 화면 리스트에 추가
      setMessages((prev) => [...prev, {
        id: Date.now(),
        senderId: newMessage.senderId,
        sender: newMessage.nickname,
        content: newMessage.content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: newMessage.senderId === profile.id,
        isRead: true
      }]);
    });

    return () => eventSource.close();
  }, [room.id, profile.id]);

  // [전송] 메시지 전송 핸들러
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const messageData = {
      roomId: room.id,
      senderId: profile.id,
      nickname: profile.nickname,
      content: input,
    };

    try {
      await fetch('http://localhost:8080/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
      setInput(''); // 전송 성공 시 입력창 초기화
    } catch (error) {
      console.error("전송 실패:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#bacee0] border">
      {/* ... (헤더 생략) ... */}
      <header className="flex items-center p-3 bg-[#bacee0] border-b border-black/5">
        <button 
          onClick={onExit} 
          className="mr-3 p-1 hover:bg-black/5 rounded-full transition text-gray-700"
          title="방 나가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-800 truncate">{room.title}</h2>
          <p className="text-[10px] text-gray-600">접속자: {profile.nickname}</p>
        </div>
        <div className="flex space-x-2 text-gray-600">
          <button className="p-1">🔍</button>
          <button className="p-1">☰</button>
        </div>
      </header>

      {/* 2. 채팅 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth">
        {messages.map((msg) => {
          // 디버깅용: 내 채팅이 안 보인다면 콘솔에서 id를 확인해 보세요.
          // console.log("Comparison:", msg.senderId, profile.id, msg.isMe);

          return (
            <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start items-start'}`}>
              
              {/* 상대방 메시지일 때만 프로필 노출 (msg.sender가 있을 때만 첫 글자 추출) */}
              {!msg.isMe && (
                <div className="w-10 h-10 bg-white rounded-xl mr-2 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-400 border border-gray-200">
                  {msg.sender ? msg.sender[0] : '익'}
                </div>
              )}

              <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                {/* 상대방 이름 노출 */}
                {!msg.isMe && (
                  <span className="text-[11px] text-gray-700 mb-1 ml-1">{msg.sender || '알 수 없음'}</span>
                )}

                <div className={`flex items-end gap-1 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                  {/* 말풍선 */}
                  <div className={`max-w-[220px] p-2 text-sm shadow-sm
                    ${msg.isMe 
                      ? 'bg-[#ffeb33] rounded-l-lg rounded-br-lg' 
                      : 'bg-white rounded-r-lg rounded-bl-lg'}`}
                  >
                    {msg.content}
                  </div>
                  
                  {/* 시간 표시 (msg.time이 없을 경우 대비) */}
                  <span className="text-[9px] text-gray-500 whitespace-nowrap mb-0.5">
                    {msg.time || '방금'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
{/* 3. 새로운 메시지 알림 팝업 (이미지 하단 레이아웃 재현) */}
<div className="mx-2 mb-2 bg-white p-2 rounded shadow-md border flex items-center justify-between animate-bounce">
        <div className="flex items-center space-x-2 overflow-hidden">
          <div className="w-6 h-6 bg-yellow-400 rounded-full flex-shrink-0" />
          <div className="text-xs truncate">
            <span className="font-bold">지훈:</span> 감사합니다 ㅋㅋ
          </div>
        </div>
        <button className="text-gray-400 text-xs">∨</button>
      </div>
      {/* 4. 입력 영역 */}
      <form onSubmit={handleSend} className="bg-white p-2">
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          className="w-full outline-none" 
        />
        <button type="submit" className="bg-[#ffeb33] px-4 py-1 rounded">전송</button>
      </form>
    </div>
  );
};

export default KakaoChat;