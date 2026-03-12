import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../constants/api';
interface KakaoInputBarProps {
  onSend: (content: string) => void;
}

const KakaoInputBar: React.FC<KakaoInputBarProps> = ({ onSend }) => {
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false); // 로딩 상태 추가
  const fileInputRef = useRef<HTMLInputElement>(null); // 파일 인풋 참조
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
 
  // 파일 선택 시 백엔드로 전송
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 로딩 시작
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 서버에 이미지 업로드 요청 (R2 업로드 로직이 담긴 API)
      const res = await fetch(`${API_BASE_URL}/api/chat/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorMsg = await res.text();
        alert(errorMsg); // "허용되지 않는 파일 형식입니다." 알림
        return;
      }

      const imageUrl = await res.text(); // 서버에서 반환한 R2 이미지 URL

      // 2. 이미지 URL을 채팅 메시지로 전송
      onSend(imageUrl); 
    } catch (err) {
      alert("파일 업로드 중 오류가 발생했습니다.");
      console.error("이미지 업로드 실패:", err);
    }finally {
      // 2. 로딩 종료 (성공/실패 상관없이 실행)
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // 인풋 초기화
    }
  };

  // 메시지 전송 로직
  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput(''); // 입력창 비우기
  };

  // 엔터 키 이벤트 처리 (onKeyDown과 handleKeyDown을 하나로 통합)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 엔터 시 줄바꿈 방지
      handleSend();
    }
  };

  // 이모지 추가 로직
  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setIsEmojiOpen(false);
  };

  return (
    <div className="bg-white border-t p-2 pb-3 relative">
      {/* 전체를 감싸는 flex 컨테이너에 items-center를 주어 수직 중앙 정렬 */}
      <div className="flex items-center gap-2">
        {/* 숨겨진 파일 인풋 */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*" 
        />
        {/* 사진 첨부 버튼*/}
        <button 
        type="button" 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-full transition"
      >
        {isUploading ? (
            // 빙글빙글 도는 스피너 (Tailwind animate-spin 사용)
            <svg className="animate-spin h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
        <span className="text-3xl mb-1">+</span>
      )}
      </button>

        {/* 입력창 영역: flex-1로 남은 공간을 다 차지하게 함 */}
        <div className="flex-1 min-h-[40px] relative flex items-center bg-gray-100 rounded-2xl px-3 py-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isUploading} // 업로드 중엔 입력 방지
            placeholder={isUploading ? "이미지 전송 중..." : "메시지 입력"}
            className="flex-1 bg-transparent outline-none text-sm resize-none h-6  pt-0.5"
            rows={1}
          />
          {/* 입력창 내부 우측 이모티콘 버튼 */}
          <button 
            type="button" 
            disabled={isUploading} // 업로드 중엔 입력 방지
            onClick={() => setIsEmojiOpen(!isEmojiOpen)} 
            className="flex-shrink-0 text-gray-500 ml-1 hover:scale-110 transition"
          >
            😊
          </button>
        </div>

        {/* 전송 버튼*/}
        <button 
        onClick={() => !isUploading && handleSend()}
        disabled={!input.trim() || isUploading}
        className={`flex-shrink-0 self-stretch px-4 rounded-xl text-sm font-bold transition-all ${
          input.trim()  && !isUploading
          ? 'bg-[#fee500] text-[#00171a] hover:bg-[#fada00] shadow-sm' 
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        전송
      </button>
      </div>

      {/* 이모지 선택창 */}
      {isEmojiOpen && (
        <div className="absolute bottom-16 right-4 bg-white border rounded-lg shadow-xl p-2 grid grid-cols-4 gap-2 z-50">
          {['❤️', '😂', '👍', '🔥', '🥰', '😮', '😭', '🙏'].map(e => (
            <button key={e} onClick={() => addEmoji(e)} className="text-xl p-1 hover:bg-gray-100 rounded">
              {e}
            </button>
          ))}
        </div>
      )}
      
    </div>
  );
};

export default KakaoInputBar;