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
      rooms: []
    };
  }

  try {
    // 利用可能な中で最も軽量で安価なモデル（gemini-flash-lite-latest）を利用
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const prompt = `あなたはダークファンタジーRPGのゲームマスターです。
プレイヤーがダンジョンの「第${floorNumber}階層」に到達しました。
以下の2つの情報を必ずJSONフォーマットで出力してください。

1. "story": この階層に降り立った時の不気味な情景描写やナレーション（100文字以内、「第${floorNumber}階層」を含めること）
2. "rooms": プレイヤーが新しい部屋に入った時に表示する、部屋の不気味な描写や環境音（各20文字程度）。配列で10個作成してください。例: "どこかで水滴の落ちる音がする…", "床に黒いシミがついている…"

必ず以下のようなJSONのみを出力してください（マークダウンのバッククォート \`\`\` やその他の説明文は一切含めないでください）。
{
  "story": "...",
  "rooms": ["...", "...", ...]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    if (text.startsWith('\`\`\`')) {
      text = text.replace(/^\`\`\`(json)?/, '').replace(/\`\`\`$/, '').trim();
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      story: `（APIエラー: ${error.message || error}）`,
      rooms: []
    };
  }
};
