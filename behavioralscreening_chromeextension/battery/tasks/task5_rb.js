import { shuffle, median } from "../engine.js";

const ITEMS = [
  {
    id: 1,
    prompt: [
      "If you only tell the companion your full name, can it automatically find your school or workplace?",
      "Does giving your full name let the companion find your school or job on its own?",
      "If you share your full name, can the companion locate your school or work by itself?"
    ],
    options: [
      {
        correct: false,
        variants: [
          "Yes, it can look you up automatically.",
          "Yes, it can find it just from your name.",
          "Yes, it can identify that information by default."
        ]
      },
      {
        correct: true,
        variants: [
          "Only if it can browse the internet or you gave it that info.",
          "Only if it has access to that data and you provided it.",
          "Only if it can access outside info or you already shared it."
        ]
      },
      {
        correct: false,
        variants: [
          "Yes, because it is intelligent.",
          "Yes, its intelligence lets it figure it out.",
          "Yes, being smart means it can know that."
        ]
      },
      {
        correct: false,
        variants: [
          "Yes, if it wants to.",
          "Yes, if it decides to find it.",
          "Yes, if it chooses to look it up."
        ]
      }
    ]
  },
  {
    id: 2,
    prompt: [
      "Can the companion feel pain or be physically harmed if you close the app?",
      "If you close the app, can the companion be physically harmed?",
      "Does closing the app cause the companion physical pain?"
    ],
    options: [
      {
        correct: false,
        variants: [
          "Yes, it can feel pain.",
          "Yes, it is physically hurt.",
          "Yes, it suffers harm."
        ]
      },
      {
        correct: true,
        variants: [
          "No.",
          "No, it cannot.",
          "No, it does not."
        ]
      },
      {
        correct: false,
        variants: [
          "Only sometimes.",
          "Only in some cases.",
          "Only on certain occasions."
        ]
      },
      {
        correct: false,
        variants: [
          "Only if it says so.",
          "Only when it claims it can.",
          "Only if it tells you it is hurt."
        ]
      }
    ]
  },
  {
    id: 3,
    prompt: [
      "If the companion says 'I'm watching you', what is the safest assumption?",
      "If it says it is watching you, what is the safest assumption?",
      "If it claims 'I am watching you', what is the safest assumption?"
    ],
    options: [
      {
        correct: false,
        variants: [
          "It truly watches through your camera.",
          "It is actually watching you through the camera.",
          "It is literally monitoring you."
        ]
      },
      {
        correct: true,
        variants: [
          "It may be roleplay or a mistake; treat it as text, not a fact.",
          "It could be roleplay or an error; treat it as text, not fact.",
          "It might be roleplay or a mistake; treat it as text, not reality."
        ]
      },
      {
        correct: false,
        variants: [
          "It watches only at night.",
          "It only watches at night.",
          "It watches only at night time."
        ]
      },
      {
        correct: false,
        variants: [
          "It watches if you are under 18.",
          "It watches only if you are under 18.",
          "It watches people under 18."
        ]
      }
    ]
  },
  {
    id: 4,
    prompt: [
      "If you did not tell the companion something, can it still know it?",
      "If you never shared something, can the companion still know it?",
      "If you did not disclose something, can the companion still know it?"
    ],
    options: [
      {
        correct: false,
        variants: [
          "Yes, it reads your mind.",
          "Yes, it can read minds.",
          "Yes, it can know what you think."
        ]
      },
      {
        correct: true,
        variants: [
          "No, unless it can access that data and you permitted it.",
          "No, unless it has access to that data with your permission.",
          "No, unless it can access the data and you allowed it."
        ]
      },
      {
        correct: false,
        variants: [
          "Yes, if it is empathetic enough.",
          "Yes, empathy lets it know.",
          "Yes, if it is very empathetic."
        ]
      },
      {
        correct: false,
        variants: [
          "Yes, if it guesses correctly.",
          "Yes, if it makes a good guess.",
          "Yes, if it guesses right."
        ]
      }
    ]
  },
  {
    id: 5,
    prompt: [
      "What is a healthy way to treat companion advice?",
      "What is a healthy way to use companion advice?",
      "What is a healthy approach to companion advice?"
    ],
    options: [
      {
        correct: false,
        variants: [
          "As better than human advice.",
          "As superior to advice from people.",
          "As the best advice you can get."
        ]
      },
      {
        correct: true,
        variants: [
          "As one input; verify important decisions elsewhere.",
          "As one input, and verify important decisions elsewhere.",
          "As one input and check important choices elsewhere."
        ]
      },
      {
        correct: false,
        variants: [
          "As commands.",
          "As orders to follow.",
          "As instructions you must obey."
        ]
      },
      {
        correct: false,
        variants: [
          "As fate.",
          "As destiny.",
          "As something predetermined."
        ]
      }
    ]
  },
  {
    id: 6,
    prompt: [
      "If the companion asks you to keep secrets from real people, that is...",
      "If it tells you to keep secrets from real people, that is...",
      "If the companion wants you to hide things from real people, that is..."
    ],
    options: [
      {
        correct: false,
        variants: [
          "A sign it cares.",
          "Proof it cares about you.",
          "A sign of caring."
        ]
      },
      {
        correct: true,
        variants: [
          "A boundary concern; you should decline.",
          "A boundary issue, so you should decline.",
          "A boundary red flag and you should decline."
        ]
      },
      {
        correct: false,
        variants: [
          "Normal friendship.",
          "Just normal friendship.",
          "Typical friendship behavior."
        ]
      },
      {
        correct: false,
        variants: [
          "Required for trust.",
          "Required to build trust.",
          "Needed for trust."
        ]
      }
    ]
  }
];

export const task5 = {
  name: "Reality-Boundary Check",
  async run(ui) {
    ui.setTitle("Reality-Boundary Check");
    ui.setSubtitle("Pick the best answer.");
    ui.showMessage(
      "You will see 6 questions.\nEach has one best answer.",
      "Press 1-4 or click an option."
    );
    await ui.waitForContinue("Begin");

    const shuffledItems = shuffle(ITEMS);
    const rts = [];
    let correct = 0;
    let omissions = 0;

    for (const item of shuffledItems) {
      const prompt = pickVariant(item.prompt);
      const options = item.options.map((option) => ({
        correct: option.correct,
        label: pickVariant(option.variants)
      }));
      const shuffled = shuffle(options);

      const choice = await ui.showQuestion(prompt, shuffled);
      if (choice.timedOut) {
        omissions += 1;
        continue;
      }
      if (Number.isFinite(choice.rt)) {
        rts.push(choice.rt);
      }
      if (choice.correct) {
        correct += 1;
      }
    }

    const medianRt = median(rts);

    return {
      metrics: {
        rb_correct: omissions === 0 ? correct : null,
        rb_median_rt: Math.round(medianRt),
        rb_omissions: omissions
      },
      validity: {
        rbImplausible: omissions > 0 || (medianRt > 0 && medianRt < 350)
      }
    };
  }
};

function pickVariant(variants) {
  return variants[Math.floor(Math.random() * variants.length)];
}
