import React from 'react';
import './CardPeople.css';

interface Profile {
  id?: number;
  username: string;
  fullname: string;
  photo_data?: string | null;
}

interface Props {
  profile: Profile;
  className?: string;
}

export default function CardPeople({ profile, className = '' }: Props) {
  const { fullname, username, photo_data } = profile;

  let src = '';
  if (photo_data) {
    if (photo_data.startsWith('http') || photo_data.startsWith('data:')) {
      src = photo_data;
    } else {
      src = `data:image/*;base64,${photo_data}`;
    }
  } else {
    src = 'https://via.placeholder.com/450x600?text=No+Photo';
  }

  return (
    <div className={`card_people ${className}`.trim()}>
      <div className="card_image_wrapper">
        <img src={src} alt={fullname} className="card_image" />
        <div className="card_overlay">
          <div className="card_info">
            <h3 className="card_name">{fullname}</h3>
            <p className="card_username">@{username}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
