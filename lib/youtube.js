const CHANNEL_HANDLE = 'ai_with_ari';
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const HIDDEN_PLAYLIST_TITLES = new Set([
  '[TAMIL] AI for All',
  'REELS : Python [TAMIL]',
  'Python [TAMIL]',
  'Projects',
  'Game Development',
  'Functional Programming in JavaScript',
]);

function toPlaylistLink(playlistId) {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

export async function getAIWithARIData(apiKey) {
  if (!apiKey) {
    return {
      status: 'error',
      message: 'Set YOUTUBE_API_KEY to load channel playlists.',
      channel: null,
      playlists: [],
    };
  }

  const channelParams = new URLSearchParams({
    part: 'snippet,statistics',
    forHandle: CHANNEL_HANDLE,
    key: apiKey,
  });

  const channelRes = await fetch(`${API_BASE}/channels?${channelParams.toString()}`);
  const channelData = await channelRes.json();
  const channelItem = channelData?.items?.[0];

  if (!channelRes.ok || !channelItem?.id) {
    return {
      status: 'error',
      message: 'Unable to load channel details from YouTube.',
      channel: null,
      playlists: [],
    };
  }

  const playlistParams = new URLSearchParams({
    part: 'snippet,contentDetails',
    channelId: channelItem.id,
    maxResults: '50',
    key: apiKey,
  });

  const playlistsRes = await fetch(`${API_BASE}/playlists?${playlistParams.toString()}`);
  const playlistsData = await playlistsRes.json();

  if (!playlistsRes.ok) {
    return {
      status: 'error',
      message: playlistsData?.error?.message || 'Playlist fetch failed.',
      channel: null,
      playlists: [],
    };
  }

  const mappedPlaylists = (playlistsData.items || [])
    .map((item) => ({
      id: item.id,
      title: item.snippet?.title || 'Untitled playlist',
      itemCount: item.contentDetails?.itemCount || 0,
      thumbnail:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
      href: toPlaylistLink(item.id),
    }))
    .filter((playlist) => !HIDDEN_PLAYLIST_TITLES.has(playlist.title));

  return {
    status: 'ready',
    message: '',
    channel: {
      title: channelItem.snippet?.title || 'AI with ARI',
      handle: channelItem.snippet?.customUrl || `@${CHANNEL_HANDLE}`,
      subscribers: channelItem.statistics?.subscriberCount || '0',
      videos: channelItem.statistics?.videoCount || '0',
      logo:
        channelItem.snippet?.thumbnails?.high?.url ||
        channelItem.snippet?.thumbnails?.medium?.url ||
        channelItem.snippet?.thumbnails?.default?.url ||
        'https://nbmpfojwah4n8nms.public.blob.vercel-storage.com/assets/hero/ari.png',
    },
    playlists: mappedPlaylists,
  };
}

export function formatCompact(value) {
  const number = Number(value || 0);

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(2).replace(/\.00$/, '')}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(2).replace(/\.00$/, '')}K`;
  }

  return `${number}`;
}

