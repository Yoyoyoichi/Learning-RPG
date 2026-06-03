const GIST_DESCRIPTION = 'LearningRPG_Sync_Database';
const FILENAME = 'learning_rpg_data.json';

/**
 * ユーザーのGist一覧から、LearningRPG用のGistを検索してIDを返す
 */
async function findSyncGist(token) {
  try {
    const res = await fetch('https://api.github.com/gists', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!res.ok) return null;
    const gists = await res.json();
    const syncGist = gists.find(g => g.description === GIST_DESCRIPTION);
    return syncGist ? syncGist.id : null;
  } catch (e) {
    console.error('Error finding gist', e);
    return null;
  }
}

/**
 * クラウド（Gist）からデータを読み込む
 */
export async function loadFromCloud(token) {
  const gistId = await findSyncGist(token);
  if (!gistId) return null; // データがまだない

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!res.ok) throw new Error('Failed to fetch gist');
    
    const gist = await res.json();
    const file = gist.files[FILENAME];
    if (file && file.content) {
      return JSON.parse(file.content);
    }
    return null;
  } catch (e) {
    console.error('Error loading from cloud', e);
    return null;
  }
}

/**
 * クラウド（Gist）にデータを保存・更新する
 */
export async function saveToCloud(token, dataObj) {
  const gistId = await findSyncGist(token);
  const content = JSON.stringify(dataObj, null, 2);

  const payload = {
    description: GIST_DESCRIPTION,
    public: false,
    files: {
      [FILENAME]: {
        content: content
      }
    }
  };

  try {
    let url = 'https://api.github.com/gists';
    let method = 'POST';

    // 既にGistが存在する場合は更新（PATCH）
    if (gistId) {
      url = `https://api.github.com/gists/${gistId}`;
      method = 'PATCH';
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to save gist');
    return true;
  } catch (e) {
    console.error('Error saving to cloud', e);
    return false;
  }
}

/**
 * ローカルストレージの全データ（成績＋カスタム問題）をクラウドに同期する
 */
export async function syncAllToCloud() {
  const token = localStorage.getItem('learning_rpg_sync_token');
  if (!token) return false;

  const stats = JSON.parse(localStorage.getItem('learning_rpg_stats') || '{}');
  const customQuestions = JSON.parse(localStorage.getItem('learning_rpg_custom_questions') || '[]');

  const dataObj = { stats, customQuestions };
  return await saveToCloud(token, dataObj);
}

/**
 * クラウドから全データをロードしてローカルストレージに反映する
 */
export async function syncAllFromCloud(tokenOverride) {
  const token = tokenOverride || localStorage.getItem('learning_rpg_sync_token');
  if (!token) return false;

  const dataObj = await loadFromCloud(token);
  if (dataObj) {
    if (dataObj.stats) {
      localStorage.setItem('learning_rpg_stats', JSON.stringify(dataObj.stats));
    }
    if (dataObj.customQuestions) {
      localStorage.setItem('learning_rpg_custom_questions', JSON.stringify(dataObj.customQuestions));
    }
    return true;
  }
  return false;
}
