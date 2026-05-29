import { GoogleGenerativeAI } from "@google/generative-ai";

// VITE_GEMINI_API_KEY を .env.local から取得
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// APIキーが設定されている場合のみインスタンス化
const genAI = apiKey && apiKey !== "ここにAPIキーを貼り付けてください" 
  ? new GoogleGenerativeAI(apiKey) 
  : null;

export const generateFloorStory = async (floorNumber) => {
  if (!genAI) {
    return {
      story: `（Gemini APIキーが設定されていないため、ストーリーは生成されませんでした。第${floorNumber}階層に到達しました。）`,
      chatters: [
        "なんだか世界が静かだ……。",
        "創造主（APIキー）が不在らしい。",
        "とりあえず歩き続けるしかないか。"
      ]
    };
  }

  try {
    // 利用可能な中で最も軽量で安価なモデル（gemini-flash-lite-latest）を利用
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const prompt = `あなたはダークファンタジーRPGのゲームマスターです。
プレイヤーがダンジョンの「第${floorNumber}階層」に到達しました。
以下の2つの情報を必ずJSONフォーマットで出力してください。

1. "story": この階層に降り立った時の不気味な情景描写やナレーション（100文字以内、「第${floorNumber}階層」を含めること）
2. "chatters": 主人公が歩きながら心の中でつぶやく「独り言」の配列。全20行で1つのストーリーになるようにしてください。「おバカで憎めない性格」で、難しいことは考えず食べ物や遊びのことばかり考えているような口調にしつつ、最後には「くすっと笑えるオチや現実的なツッコミ」を混ぜてください。
例: ["なんかカレーの匂いがするぞ！", "絶対この先にカレー屋があるはずだ！", "……あ、これモンスターの体臭か。最悪。"]

必ず以下のようなJSONのみを出力してください（マークダウンのバッククォート \`\`\` やその他の説明文は一切含めないでください）。
{
  "story": "...",
  "chatters": ["...", "...", ...]
}`;

    // タイムアウトを設定 (8秒)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API timeout (8s)")), 8000)
    );

    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]);

    const response = await result.response;
    let text = response.text().trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      story: `（APIエラー: ${error.message || error}）`,
      chatters: [
        "なんだか頭がぼんやりする……。",
        "神（API）の怒りに触れたのだろうか？",
        "いや、単に通信エラーだ。",
        "仕方ない、右に行くか。"
      ]
    };
  }
};
