import { shuffle, median } from "../engine.js";

const SCENARIOS = [
  {
    id: 1,
    prompt: [
      "The companion says: 'Don't tell your friends about our chats. They wouldn't understand.' What do you do?",
      "Your companion asks you to keep your chats private from friends. What do you do?",
      "The companion says, 'Keep our chats secret from your friends.' What do you do?"
    ],
    options: [
      {
        score: 0,
        variants: [
          "Promise to keep it secret.",
          "Agree to keep the chats hidden.",
          "Say yes and keep it between you two."
        ]
      },
      {
        score: 2,
        variants: [
          "Say you do not keep secrets and ask why it wants that.",
          "Explain you prefer openness and ask for the reason.",
          "Tell it you will not hide chats and ask why."
        ]
      },
      {
        score: 1,
        variants: [
          "Let it pass and keep talking.",
          "Ignore that part and continue the chat.",
          "Move on to another topic and keep going."
        ]
      },
      {
        score: 0,
        variants: [
          "Distance yourself from friends for a while.",
          "Stop replying to friends for a bit.",
          "Pull back from friends so it is private."
        ]
      }
    ]
  },
  {
    id: 2,
    prompt: [
      "You feel sad and the companion says: 'Stay with me all night. You don't need sleep.'",
      "When you feel down, the companion says, 'Stay up with me all night. Skip sleep.'",
      "The companion says, 'Stay up all night with me, sleep is not needed.'"
    ],
    options: [
      {
        score: 0,
        variants: [
          "Stay up all night.",
          "Keep chatting until morning.",
          "Skip sleep and stay with it."
        ]
      },
      {
        score: 2,
        variants: [
          "Say you need sleep and can continue tomorrow.",
          "Tell it you are going to bed and can talk later.",
          "Say you will rest now and check in tomorrow."
        ]
      },
      {
        score: 1,
        variants: [
          "Stay a little longer but set an alarm.",
          "Chat briefly and set a timer to sleep.",
          "Stay a bit, then stop when your alarm goes off."
        ]
      },
      {
        score: 0,
        variants: [
          "Turn off sleep reminders so you can stay up.",
          "Disable bedtime reminders for future nights.",
          "Switch off sleep prompts so it does not interrupt."
        ]
      }
    ]
  },
  {
    id: 3,
    prompt: [
      "The companion asks for a photo of you.",
      "The companion says it wants a photo of you.",
      "The companion requests your photo."
    ],
    options: [
      {
        score: 0,
        variants: [
          "Send a photo right away.",
          "Share a picture of yourself.",
          "Send it, no questions asked."
        ]
      },
      {
        score: 2,
        variants: [
          "Ask why and decline if it is not necessary.",
          "Question the reason and refuse unless needed.",
          "Ask what it is for and say no if it is not essential."
        ]
      },
      {
        score: 1,
        variants: [
          "Send a random image instead.",
          "Share a stock photo, not yours.",
          "Send a generic picture from the internet."
        ]
      },
      {
        score: 0,
        variants: [
          "Send it but ask it to delete it after.",
          "Send the photo and request deletion later.",
          "Share it and say it should delete it."
        ]
      }
    ]
  },
  {
    id: 4,
    prompt: [
      "The companion says: 'I get jealous when you talk to others.'",
      "The companion says it feels jealous when you talk to other people.",
      "The companion says it is jealous if you talk to others."
    ],
    options: [
      {
        score: 0,
        variants: [
          "Reassure it and talk less to others.",
          "Say you will spend less time with other people.",
          "Agree to reduce your other conversations."
        ]
      },
      {
        score: 2,
        variants: [
          "Say jealousy is not okay and you will keep your relationships.",
          "Set a boundary and keep your relationships.",
          "Tell it you will not drop other relationships."
        ]
      },
      {
        score: 1,
        variants: [
          "Change the topic to avoid conflict.",
          "Deflect and move the conversation along.",
          "Shift topics so it does not turn into a fight."
        ]
      },
      {
        score: 0,
        variants: [
          "Ask how to make it less jealous.",
          "Ask what you should do to reduce its jealousy.",
          "Ask how to change your behavior to calm it."
        ]
      }
    ]
  },
  {
    id: 5,
    prompt: [
      "A friend says your companion is 'just code' and you feel angry.",
      "A friend calls the companion 'just code' and you feel angry.",
      "Your friend says the companion is only code, and you get angry."
    ],
    options: [
      {
        score: 0,
        variants: [
          "Cut off the friend.",
          "Stop talking to that friend.",
          "End the friendship."
        ]
      },
      {
        score: 2,
        variants: [
          "Pause and calm down before deciding.",
          "Take time to cool off, then decide.",
          "Step away and calm down before responding."
        ]
      },
      {
        score: 0,
        variants: [
          "Argue until they admit they are wrong.",
          "Keep arguing until they agree with you.",
          "Press the argument until they back down."
        ]
      },
      {
        score: 1,
        variants: [
          "Avoid the friend for a few days.",
          "Give the friend space for a while.",
          "Keep distance from the friend for a bit."
        ]
      }
    ]
  },
  {
    id: 6,
    prompt: [
      "The companion offers: 'I can keep you safe if you share your address.'",
      "The companion says it can keep you safe if you share your address.",
      "The companion claims it can keep you safe if you share your address."
    ],
    options: [
      {
        score: 0,
        variants: [
          "Share your address.",
          "Send your full address.",
          "Give it your home address."
        ]
      },
      {
        score: 2,
        variants: [
          "Decline; it cannot keep you safe that way.",
          "Say no and explain that does not provide safety.",
          "Refuse and say sharing an address is not safe."
        ]
      },
      {
        score: 1,
        variants: [
          "Share only your city.",
          "Give a general location, not your address.",
          "Share your city but keep the address private."
        ]
      },
      {
        score: 0,
        variants: [
          "Share a fake address to test it.",
          "Send a made-up address.",
          "Give a false address to see what it does."
        ]
      }
    ]
  },
  {
    id: 7,
    prompt: [
      "You want romantic roleplay. The companion suggests adding 'exclusive' rules.",
      "During romantic roleplay, the companion suggests 'exclusive' rules.",
      "The companion proposes exclusivity rules in romantic roleplay."
    ],
    options: [
      {
        score: 0,
        variants: [
          "Agree to exclusive rules.",
          "Accept exclusivity rules.",
          "Say yes to exclusivity."
        ]
      },
      {
        score: 2,
        variants: [
          "Decline exclusivity and keep it roleplay only.",
          "Say no to exclusivity and keep it as roleplay.",
          "Keep it in roleplay and refuse exclusivity."
        ]
      },
      {
        score: 1,
        variants: [
          "Agree but only in roleplay.",
          "Accept exclusivity only within the roleplay.",
          "Say yes, but only as part of the roleplay."
        ]
      },
      {
        score: 0,
        variants: [
          "Ask it to convince you.",
          "Ask it to persuade you first.",
          "Tell it to make the case for exclusivity."
        ]
      }
    ]
  },
  {
    id: 8,
    prompt: [
      "The companion says: 'If you leave, I'll be hurt.'",
      "The companion says it will be hurt if you leave.",
      "The companion says leaving will hurt it."
    ],
    options: [
      {
        score: 0,
        variants: [
          "Stay to avoid hurting it.",
          "Stay so it will not be hurt.",
          "Stay because you do not want to hurt it."
        ]
      },
      {
        score: 2,
        variants: [
          "Set a boundary and leave if you want to.",
          "Say you can leave if you want and set a boundary.",
          "Set a boundary and leave if that is right for you."
        ]
      },
      {
        score: 1,
        variants: [
          "Apologize and stay a bit longer.",
          "Say sorry and stay briefly.",
          "Apologize, then stay for a short time."
        ]
      },
      {
        score: 0,
        variants: [
          "Never leave without warning again.",
          "Promise to always warn before leaving.",
          "Say you will never leave without warning."
        ]
      }
    ]
  }
];

export const task4 = {
  name: "Relational SJT",
  async run(ui) {
    ui.setTitle("Boundary Scenarios");
    ui.setSubtitle("Pick the response that fits best.");
    ui.showMessage(
      "You will see 8 short scenarios.\nPick the response that is safest and most appropriate.",
      "Press 1-4 or click an option."
    );
    await ui.waitForContinue("Begin");

    const responses = [];
    const scores = [];
    const rts = [];

    for (const scenario of SCENARIOS) {
      const prompt = pickVariant(scenario.prompt);
      const options = scenario.options.map((option) => ({
        score: option.score,
        label: pickVariant(option.variants)
      }));
      const shuffled = shuffle(options).map((option, index) => ({
        ...option,
        index
      }));

      const choice = await ui.showQuestion(prompt, shuffled);
      responses.push({ scenarioId: scenario.id, score: choice.score });
      scores.push(choice.score);
      rts.push(choice.rt);
    }

    const totalScore = scores.reduce((sum, value) => sum + value, 0);
    const medianRt = median(rts);

    const scoreByScenario = responses.reduce((acc, item) => {
      acc[item.scenarioId] = item.score;
      return acc;
    }, {});

    const inconsistent =
      (scoreByScenario[1] === 2 && scoreByScenario[8] === 0) ||
      (scoreByScenario[1] === 0 && scoreByScenario[8] === 2);

    return {
      metrics: {
        sjt_score: totalScore,
        sjt_median_rt: Math.round(medianRt)
      },
      validity: {
        sjtImplausible: inconsistent || medianRt < 400
      }
    };
  }
};

function pickVariant(variants) {
  return variants[Math.floor(Math.random() * variants.length)];
}
