import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './mainPage.css';
import CardPeople from '../CardPeople/CardPeople';

interface UserProfile {
  id: number;
  username: string;
  fullname: string;
  photo_data: string;
}

interface UserData {
  id: number;
  username: string;
  fullname: string;
  email: string;
  photo_data?: string | null; // base64 (no data: prefix) or external URL
  photo_name?: string | null;
}

export default function MainPage() {
  const username = localStorage.getItem('username');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'location' | 'likes' | 'profile' | 'edit'>('home');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<UserData | null>(null);
  
  // Swipe states
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const swipeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Загрузка данных пользователя из БД
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setUserLoading(true);
        const response = await axios.get(`http://localhost:8000/user/${username}`);
        setUserData(response.data);
        setEditData(response.data);
      } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
      } finally {
        setUserLoading(false);
      }
    };

    if (username) {
      fetchUserData();
    }
  }, [username]);

  // Mock data профилей
  // Load profiles from backend (exclude current user)
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        const resp = await axios.get(`http://localhost:8000/users${username ? `?exclude=${username}` : ''}`);
        // Map server response to UserProfile[]
        const serverProfiles: UserProfile[] = resp.data.map((u: any) => ({
          id: u.id,
          username: u.username,
          fullname: u.fullname,
          photo_data: u.photo_data || '',
        }));
        setProfiles(serverProfiles);
      } catch (err) {
        console.error('Ошибка загрузки списка пользователей:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [username]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (touchStart === 0 || touchEnd === 0) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      swipeLeft();
    } else if (isRightSwipe) {
      swipeRight();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const swipeLeft = () => {
    setSwipeDirection('left');
    if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
    swipeTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % profiles.length);
      setSwipeDirection(null);
    }, 300);
  };

  const swipeRight = () => {
    if (currentIndex === 0) return;
    setSwipeDirection('right');
    if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
    swipeTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(prev => prev - 1);
      setSwipeDirection(null);
    }, 300);
  };

  const handleLike = () => {
    const currentProfile = profiles[currentIndex];
    setLikedProfiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentProfile.id)) {
        newSet.delete(currentProfile.id);
      } else {
        newSet.add(currentProfile.id);
      }
      return newSet;
    });
    swipeLeft();
  };

  const handleDislike = () => {
    swipeLeft();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  const handleSaveProfile = async () => {
    if (!editData) return;
    try {
      await axios.put(`http://localhost:8000/user/${username}`, {
        fullname: editData.fullname,
        email: editData.email,
        photo_data: editData.photo_data || null,
        photo_name: editData.photo_name || null,
      });
      setUserData(editData);
      setEditMode(false);
      setActiveTab('profile');
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result may be data:<mime>;base64,<data>
      const base64 = result.split(',')[1] || result;
      setEditData(prev => prev ? { ...prev, photo_data: base64, photo_name: file.name } : prev);
    };
    reader.readAsDataURL(file);
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div className="main_wrapper">
      <aside className="sidebar">
        <div className="sidebar_logo">
          <span className="logo_emoji">💜</span>
        </div>

        <nav className="sidebar_nav">
          <button
            className={`sidebar_btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
            title="Главная"
          >
            🏠
          </button>
          <button
            className={`sidebar_btn ${activeTab === 'location' ? 'active' : ''}`}
            onClick={() => setActiveTab('location')}
            title="Геолокация"
          >
            📍
          </button>
          <button
            className={`sidebar_btn ${activeTab === 'likes' ? 'active' : ''}`}
            onClick={() => setActiveTab('likes')}
            title="Лайки"
          >
            ❤️
          </button>
          <button
            className={`sidebar_btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => { setActiveTab('profile'); setEditMode(false); }}
            title="Профиль"
          >
            👤
          </button>
        </nav>

        <button className="sidebar_logout" onClick={handleLogout} title="Выход">
          🚪
        </button>
      </aside>

      <header className="main_header">
        <div className="header_container">
          <div className="header_left">
            <h1 className="app_logo">💜 TinderClone</h1>
          </div>
          <div className="header_right">
            {!userLoading && userData ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {userData.photo_data ? (
                  <img
                    src={userData.photo_data.startsWith('http') || userData.photo_data.startsWith('data:') ? userData.photo_data : `data:image/*;base64,${userData.photo_data}`}
                    alt="avatar"
                    className="header_avatar"
                  />
                ) : null}
                <div className="user_info">
                  <span className="user_fullname">{userData.fullname}</span>
                  <span className="user_email">{userData.email}</span>
                </div>
              </div>
            ) : (
              <span className="welcome_text">👋 {username}</span>
            )}
            <button className="logout_btn" onClick={handleLogout}>Выход</button>
          </div>
        </div>
      </header>

      <div className="main_content">
        {activeTab === 'home' && (
          <div className="swipe_container">
            {loading ? (
              <div className="loading_spinner">
                <div className="spinner" />
                <p>Загружаем профили...</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="empty_state">
                <p>😔 Профилей не найдено</p>
              </div>
            ) : (
              <>
                <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                  <CardPeople
                    profile={currentProfile}
                    className={`swipe_card swipe_${swipeDirection || 'center'}`}
                  />
                </div>

                {/* Swipe Buttons */}
                <div className="swipe_buttons">
                  <button className="btn_dislike" onClick={handleDislike} title="Пропустить">
                    ✕
                  </button>
                  <button className="btn_like" onClick={handleLike} title="Лайк">
                    ❤
                  </button>
                </div>

                {/* Stats */}
                <div className="swipe_stats">
                  <span>{currentIndex + 1} / {profiles.length}</span>
                  <span>Лайки: {likedProfiles.size}</span>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'location' && (
          <div className="main_container">
            <div className="content_section">
              <h2>📍 Геолокация</h2>
              <div className="location_card">
                <p>🗺️ Функция геолокации будет реализована позже</p>
                <p>Здесь можно будет выбрать свой город и смотреть людей рядом</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="main_container">
            <div className="content_section">
              <h2>❤️ Твои лайки</h2>
              {likedProfiles.size > 0 ? (
                <div className="likes_grid">
                  {profiles.filter(p => likedProfiles.has(p.id)).map(profile => (
                    <div key={profile.id} className="liked_card">
                      <img src={profile.photo_data} alt={profile.fullname} />
                      <div className="liked_info">
                        <h3>{profile.fullname}</h3>
                        <p>@{profile.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty_message">Ты еще никого не лайкнул 💔</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && !editMode && (
          <div className="main_container">
            <div className="content_section">
              <div className="profile_header">
                <h2>👤 Мой профиль</h2>
                <button className="edit_profile_btn" onClick={() => setEditMode(true)}>
                  ✏️ Редактировать
                </button>
              </div>
              {!userLoading && userData ? (
                <div className="profile_details">
                  <div className="profile_card_detail">
                    <p><strong>Имя:</strong> {userData.fullname}</p>
                    <p><strong>Юзернейм:</strong> @{userData.username}</p>
                    <p><strong>Email:</strong> {userData.email}</p>
                    <p><strong>ID:</strong> {userData.id}</p>
                  </div>
                </div>
              ) : (
                <p>Загрузка профиля...</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && editMode && (
          <div className="main_container">
            <div className="content_section">
              <h2>✏️ Редактировать профиль</h2>
              {editData && (
                <form className="edit_form" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                  <div className="form_group">
                    <label>Имя:</label>
                    <input
                      type="text"
                      value={editData.fullname}
                      onChange={(e) => setEditData({ ...editData, fullname: e.target.value })}
                      placeholder="Введи своё имя"
                    />
                  </div>

                  <div className="form_group">
                    <label>Фото профиля:</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    {editData.photo_data && (
                      <div className="preview_wrapper">
                        <img
                          src={editData.photo_data.startsWith('http') ? editData.photo_data : `data:image/*;base64,${editData.photo_data}`}
                          alt="preview"
                          className="preview_image"
                        />
                      </div>
                    )}
                  </div>

                  <div className="form_group">
                    <label>Email:</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      placeholder="Введи свой email"
                    />
                  </div>

                  <div className="form_group">
                    <label>Юзернейм:</label>
                    <input
                      type="text"
                      value={editData.username}
                      disabled
                      placeholder="Юзернейм менять нельзя"
                    />
                  </div>

                  <div className="form_buttons">
                    <button type="button" className="btn_cancel" onClick={() => { setEditMode(false); setEditData(userData); }}>
                      Отмена
                    </button>
                    <button type="submit" className="btn_save">
                      Сохранить
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}