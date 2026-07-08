import { GoogleGenerativeAI } from "@google/generative-ai";

const getGenAI = () => {
  const storedKey = localStorage.getItem('GEMINI_API_KEY');
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiKey = storedKey || envKey;
  
  if (apiKey && apiKey !== "ここにAPIキーを貼り付けてください") {
    return new GoogleGenerativeAI(apiKey);
  }
  return null;
};

export const generateFloorStory = async (floorNumber) => {
  const genAI = getGenAI();
  if (!genAI) {
    return {
      story: `（Gemini APIキーが設定されていないため、ストーリーは生成されませんでした。）`,
      chatters: ["なんだか世界が静かだ……。"]
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
    const prompt = `あなたはダークファンタジーRPG of ゲームマスターです。プレイヤーが「第${floorNumber}階層」に到達しました。情景描写をJSONで出力してください。`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text().trim());
  } catch (e) {
    return { story: "エラーが発生しました。", chatters: [] };
  }
};

export const generateMemoryFloorStory = async (floorNumber, seed = "default-seed", numObjects = 5) => {
  const genAI = getGenAI();

  if (!genAI) {
    throw new Error("Gemini API key is not configured.");
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-lite-latest",
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.95
      }
    });

    const alphabet = Array.from({ length: numObjects }, (_, i) => String.fromCharCode(65 + i));
    const lastChar = alphabet[alphabet.length - 1] || 'E';

    const objectsSchema = alphabet.map((char, index) => {
      const isLast = index === alphabet.length - 1;
      const partDesc = isLast 
        ? `結末となる文章。末尾に必ず「（元データ: [出元], [想定日付]）」を含めてください`
        : index === 0 
          ? "ログの導入となる文章" 
          : `時系列のつながりの中盤（展開 ${index}）の文章`;
      return `    {
      "id": "${char}",
      "name": "オブジェクト${char}の名前（この情景や物品から命名）",
      "text": "プレイヤーがこのオブジェクトに触れた際に表示される、${partDesc}（100文字程度）"
    }`;
    }).join(",\n");

    const prompt = `あなたは1995年〜2005年頃の日本のインターネットアーカイブから、過去のログを自動的に拾い上げるシステムです。
プレイヤーが「第${floorNumber}階層」（電脳深度: ${floorNumber * 100}m）に到達しました。

あなたの記憶（学習データ）にある、1995年〜2005年当時の日本のウェブ上に実在していたであろうテキストログを1つランダムに想起し、${numObjects}個のオブジェクト [${alphabet.join("], [")}] のストーリー断片として出力してください。

【出力の絶対ルール：形式の統一と文脈の完全な接続】
1. **フロアごとに『1つのウェブ形式』を必ず選択し、全断片（A〜${lastChar}）で統一すること**:
   今回想起するストーリーを、以下のいずれか「1つの形式」に決定してください。
   - 【形式1: 個人サイトの日記】: A〜${lastChar}はすべて「同一人物が書いた、その日の日記の文章の流れ（Aから${lastChar}へ流れる）」で統一する。
   - 【形式2: BBS・電子掲示板のスレッド】: A〜${lastChar}はすべて「同じ掲示板スレッドの書き込み（レスポンスの流れ。例えばAが最初の質問、Bがレス、Cが次の返信など、時系列のやり取り）」で統一する。
   - 【形式3: 足跡帳・一行伝言板】: A〜${lastChar}はすべて「同じホームページの伝言板に、別々の人が残した挨拶の連なり（または管理人との会話）」で統一する。
   - 【形式4: 創作テキストのあとがきやメール下書き】: A〜${lastChar}はすべて「同一人物の個人的なテキスト下書き」で統一する。
   ※断片Aは日記、断片BはBBSレス、というように断片ごとに異なる形式や人物を混ぜることは【絶対禁止】です。
   ※毎回異なるバリエーション豊かな形式（日記、BBS、足跡帳、メール下書き等）を偏りなく想起してください。

2. **時系列と登場人物（またはBBSスレッド）の完全な接続**:
   A → B → C → ... → ${lastChar} の順で読んだときに、1つの繋がったエピソードや会話の流れとして完全に文脈が通るようにしてください。

3. **当時の生活感やネットの気配**:
   押し付けがましい「寂しさ」の演出は不要です。淡々とした日常の記録や、当時の素朴なネット上の対話をありのまま再現してください。
   ※特定の固定された事物やトピック（食べ物など）ばかりに偏らないよう、多様なバリエーションの生活描写や当時の素朴なネット上の対話を想起してください。
   ※「サーバー」「セクター」「プロトコル」といったSF的専門用語は禁止。

最後の${lastChar}のテキストの末尾に、情報への敬意を込めて「（元データ: [選んだ形式/出元], [1995〜2005年のいずれかの想定日付]）」を記載してください。

※重要：以下の「生成シードノイズ」に含まれる文字列の揺らぎを、想起するテキストのパラメータとして内部でデコードして反映させ、毎回異なるバリエーションと偶然性をもたらしてください。

生成シードノイズ: "${seed}"

以下の構造のJSONフォーマットでのみ出力してください（説明文などは一切含めないこと）。

{
  "message": "第${floorNumber}階層に接続した際に表示するシステムメッセージ（例: 『警告：Geocities - 2002/05/11 のレコードと接続。』など、30文字程度）",
  "npcName": "観察者NPCの名前",
  "npcText": "観察者NPCのセリフ。※【超重要ルール】: 今回生成した『objects』配列（A〜${lastChar}のテキスト本文）に書かれている具体的な物事（例：読書感想文、ハリー・ポッター、冷やし中華、からしなど）を【最低1つは具体的な名詞として必ずセリフに取り込んで】ください。抽象的な定型文（『誰もいない掲示板』『あの頃の空気』『少し覗いてみましょうか』などの誰にでも使い回せるようなセリフ）は【絶対禁止】とします。その些細な日常の断片だからこそ宿る『人間の生々しさ、滑稽さ、当時の空気』について、哀愁を帯びた、または静かに思いを馳せる達観したトーンで呟かせてください（100文字程度）",
  "objects": [
${objectsSchema}
  ]
}

必ず上記の有効なJSONのみを返してください。`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API timeout (40s)")), 40000)
    );

    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]);

    const response = await result.response;
    let text = response.text().trim();
    
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Memory Story Error:", error);
    throw error;
  }
};

export const generateQuizFeedback = async (questionObj, answer, isCorrect) => {
  const genAI = getGenAI();
  if (!genAI) {
    return {
      tutorExplanation: `（Gemini APIキーが設定されていないため、解説は生成されませんでした。）`
    };
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-lite-latest",
      generationConfig: { responseMimeType: "application/json" }
    });

    const choicesStr = questionObj.shuffledChoices ? `選択肢: ${questionObj.shuffledChoices.join(', ')}` : '選択肢なし（タイピング問題など）';
    
    const prompt = `あなたはファンタジーRPGの専属AI家庭教師です。
プレイヤーが以下の問題に解答しました。

問題: ${questionObj.question}
選択肢: ${choicesStr}
プレイヤーの解答: ${answer}
結果: ${isCorrect ? '正解' : '不正解'}
正解: ${questionObj.answer}
${questionObj.explanation ? `解説: ${questionObj.explanation}` : ''}

上記の解答状況を踏まえて、解答に対するフィードバックと、なぜその答えになるのか・どう覚えればいいかの解説を生成してください。
※絶対にネガティブな発言や、皮肉、プレイヤーを貶めるような発言はしないでください。明るく優しい口調にしてください。

以下の情報をJSONフォーマットで出力してください。
{
  "tutorExplanation": "..."
}`;

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
    console.error("Gemini API Feedback Error:", error);
    return {
      tutorExplanation: `APIエラー: ${error.message || error}`
    };
  }
};

export const generateGameStateComment = async (gameState) => {
  const genAI = getGenAI();
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-lite-latest",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `あなたはファンタジーRPGの専属AI家庭教師です。
現在、プレイヤーは以下の状況に置かれています。

【ゲーム状況】
階層: 第${gameState.floor}階層
プレイヤーHP: ${gameState.hp} / ${gameState.maxHp}
${gameState.inBattle ? `戦闘中: 敵「${gameState.enemyName}」 (HP: ${gameState.enemyHp})` : '探索中（戦闘は発生していません）'}
${gameState.recentQuestion ? `直近のクイズ問題: ${gameState.recentQuestion.question} (正解: ${gameState.recentQuestion.answer})` : ''}

上記の状況を踏まえて、プレイヤーを応援する、またはメタ的なツッコミを入れるアドバイスを1つ生成してください。（50文字以内）
※絶対にネガティブな発言や、皮肉、プレイヤーを貶めるような発言はしないでください。明るく優しい口調にしてください。

以下の情報をJSONフォーマットで出力してください。
{
  "comment": "..."
}`;

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
    console.error("Gemini API GameState Comment Error:", error);
    return null;
  }
};

export const generateQuizHint = async (questionObj) => {
  const genAI = getGenAI();
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-lite-latest",
      generationConfig: { responseMimeType: "application/json" }
    });

    const choicesStr = questionObj.shuffledChoices ? `選択肢: ${questionObj.shuffledChoices.join(', ')}` : '選択肢なし（タイピング問題など）';
    
    const prompt = `あなたはファンタジーRPGの専属AI家庭教師です。
プレイヤーが以下の問題で悩んでいます。

問題: ${questionObj.question}
正解: ${questionObj.answer}
${choicesStr}
${questionObj.explanation ? `解説: ${questionObj.explanation}` : ''}

プレイヤーに「正解そのもの」を直接教えずに、少しだけひらめくような「ヒント」を1つだけ生成してください。（50文字以内）
※絶対に正解そのものを書かないでください。明るく優しい口調にしてください。

以下の情報をJSONフォーマットで出力してください。
{
  "comment": "..."
}`;

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
    console.error("Gemini API Quiz Hint Error:", error);
    return null;
  }
};
