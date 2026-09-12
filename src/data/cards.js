/**
 * ---------------------------------------------------------------------
 * MOCK DATA LAYER — stand-in for a real backend.
 * ---------------------------------------------------------------------
 *
 * Each card has a different interpretation for every category.
 * The frontend only talks to fetchDailyCard().
 * ---------------------------------------------------------------------
 */

export const CARDS = {
  fool: {
    id: "fool",
    name: "The Fool",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_00_Fool.jpg",
    imageAlt: "The Fool, Rider-Waite-Smith tarot deck",
  },
  magician: {
    id: "magician",
    name: "The Magician",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_01_Magician.jpg",
    imageAlt: "The Magician, Rider-Waite-Smith tarot deck",
  },
  high_priestess: {
    id: "high_priestess",
    name: "The High Priestess",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_02_High_Priestess.jpg",
    imageAlt: "The High Priestess, Rider-Waite-Smith tarot deck",
  },
  empress: {
    id: "empress",
    name: "The Empress",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_03_Empress.jpg",
    imageAlt: "The Empress, Rider-Waite-Smith tarot deck",
  },
  emperor: {
    id: "emperor",
    name: "The Emperor",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_04_Emperor.jpg",
    imageAlt: "The Emperor, Rider-Waite-Smith tarot deck",
  },
  hierophant: {
    id: "hierophant",
    name: "The Hierophant",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_05_Hierophant.jpg",
    imageAlt: "The Hierophant, Rider-Waite-Smith tarot deck",
  },
  the_lovers: {
    id: "the_lovers",
    name: "The Lovers",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS-06-thelovers.jpg",
    imageAlt: "The Lovers, Rider-Waite-Smith tarot deck",
  },
  chariot: {
    id: "chariot",
    name: "The Chariot",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_07_Chariot.jpg",
    imageAlt: "The Chariot, Rider-Waite-Smith tarot deck",
  },
  strength: {
    id: "strength",
    name: "Strength",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_08_Strength.jpg",
    imageAlt: "Strength, Rider-Waite-Smith tarot deck",
  },
  hermit: {
    id: "hermit",
    name: "The Hermit",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_09_Hermit.jpg",
    imageAlt: "The Hermit, Rider-Waite-Smith tarot deck",
  },
  wheel_of_fortune: {
    id: "wheel_of_fortune",
    name: "Wheel of Fortune",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_10_Wheel_of_Fortune.jpg",
    imageAlt: "The Wheel of Fortune, Rider-Waite-Smith tarot deck",
  },
  justice: {
    id: "justice",
    name: "Justice",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_11_Justice.jpg",
    imageAlt: "Justice, Rider-Waite-Smith tarot deck",
  },
  hanged_man: {
    id: "hanged_man",
    name: "The Hanged Man",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_12_Hanged_Man.jpg",
    imageAlt: "The Hanged Man, Rider-Waite-Smith tarot deck",
  },
  temperance: {
    id: "temperance",
    name: "Temperance",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_14_Temperance.jpg",
    imageAlt: "Temperance, Rider-Waite-Smith tarot deck",
  },
  devil: {
    id: "devil",
    name: "The Devil",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_15_Devil.jpg",
    imageAlt: "The Devil, Rider-Waite-Smith tarot deck",
  },
  tower: {
    id: "tower",
    name: "The Tower",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_16_Tower.jpg",
    imageAlt: "The Tower, Rider-Waite-Smith tarot deck",
  },
  the_star: {
    id: "the_star",
    name: "The Star",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_17_Star.jpg",
    imageAlt: "The Star, Rider-Waite-Smith tarot deck",
  },
  moon: {
    id: "moon",
    name: "The Moon",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_18_Moon.jpg",
    imageAlt: "The Moon, Rider-Waite-Smith tarot deck",
  },
  the_sun: {
    id: "the_sun",
    name: "The Sun",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_19_Sun.jpg",
    imageAlt: "The Sun, Rider-Waite-Smith tarot deck",
  },
  world: {
    id: "world",
    name: "The World",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_21_World.jpg",
    imageAlt: "The World, Rider-Waite-Smith tarot deck",
  },
};

/**
 * Short, category-independent captions used only on the "Share Reading"
 * graphic (the branded sigil card the user downloads/shares). These are
 * intentionally generic — one line of flavor text per card, not tied to
 * love/finance/career/pets/health.
 */
const SHARE_BLURBS = {
  fool: "Getting the Fool as your daily card is a sign that a fresh start is calling. This card is all about new beginnings, leaps of faith, and the freedom of an open road.",
  magician: "Getting the Magician as your daily card is a sign that you have every tool you need. This card is all about willpower, resourcefulness, and turning intention into action.",
  high_priestess: "Getting the High Priestess as your daily card is a sign to trust what you already sense. This card is all about intuition, quiet knowing, and the wisdom beneath the surface.",
  empress: "Getting the Empress as your daily card is a sign of growth in motion. This card is all about abundance, nurturing, and creativity coming into full bloom.",
  emperor: "Getting the Emperor as your daily card is a sign to build on solid ground. This card is all about structure, steady leadership, and the order that comes from discipline.",
  hierophant: "Getting the Hierophant as your daily card is a sign to lean on tradition and guidance. This card is all about shared wisdom, learning, and time-tested paths forward.",
  the_lovers: "Getting the Lovers as your daily card is a sign that a meaningful choice is near. This card is all about connection, alignment, and choosing what truly fits your values.",
  chariot: "Getting the Chariot as your daily card is a sign that determination will carry you through. This card is all about willpower, momentum, and steering confidently toward your goal.",
  strength: "Getting Strength as your daily card is a sign that quiet courage is your greatest tool. This card is all about patience, inner resolve, and gentle power over force.",
  hermit: "Getting the Hermit as your daily card is a sign to turn inward for a while. This card is all about reflection, solitude, and the guidance found in stillness.",
  wheel_of_fortune: "Getting the Wheel of Fortune as your daily card is a powerful sign that the winds are shifting. This card is all about destiny, unexpected changes, and the natural cycles of life.",
  justice: "Getting Justice as your daily card is a sign that truth and balance are coming into focus. This card is all about fairness, accountability, and clear-eyed decisions.",
  hanged_man: "Getting the Hanged Man as your daily card is a sign to pause and see things differently. This card is all about surrender, new perspective, and the value of waiting.",
  temperance: "Getting Temperance as your daily card is a sign that balance is within reach. This card is all about patience, moderation, and blending opposites into harmony.",
  devil: "Getting the Devil as your daily card is a sign to look closely at what's holding you back. This card is all about attachment, temptation, and reclaiming your own power.",
  tower: "Getting the Tower as your daily card is a sign that sudden change is clearing the way. This card is all about upheaval, revelation, and rebuilding on truer foundations.",
  the_star: "Getting the Star as your daily card is a sign that hope is quietly returning. This card is all about renewal, inspiration, and gentle faith in what's ahead.",
  moon: "Getting the Moon as your daily card is a sign to trust your instincts through the unclear parts. This card is all about intuition, dreams, and navigating uncertainty.",
  the_sun: "Getting the Sun as your daily card is a sign of warmth and clarity ahead. This card is all about joy, vitality, and simple, well-earned optimism.",
  world: "Getting the World as your daily card is a sign that a meaningful cycle is completing. This card is all about fulfillment, wholeness, and celebrating how far you've come.",
};

function shareBlurbFor(cardId, cardName) {
  return (
    SHARE_BLURBS[cardId] ||
    `Getting ${cardName} as your daily card is a meaningful sign worth sitting with today.`
  );
}

const CARD_MEANINGS = {
  fool: {
    love: {
      summary: [
        "A new connection or a fresh chapter in your love life is beginning. The Fool brings a sense of possibility, curiosity, and emotional freedom, suggesting that something meaningful may grow when you stop trying to predict every outcome. If you're single, you may be more open to meeting someone unexpected. If you're already in a relationship, this is a good time to bring back spontaneity and remember what made the connection exciting in the first place.",
      ],
      advice: "Don't over-plan this one. Let curiosity lead, stay open to what unfolds, and give the connection room to develop naturally.",
    },
    finance: {
      summary: [
        "An unexpected financial opportunity may catch your attention today. It could involve a new source of income, an interesting idea, or a purchase that feels exciting in the moment. The Fool encourages you to explore new possibilities, but it also reminds you that excitement is not the same as certainty. Take the first step if the opportunity feels worthwhile, while making sure you still have enough security behind you.",
      ],
      advice: "Explore the opportunity, but don't throw caution completely aside. Take a calculated first step and keep a financial safety net.",
    },
    career: {
      summary: [
        "A fresh start is calling in your professional life. You may be considering a new role, project, business idea, or direction that feels unfamiliar but exciting. The Fool reminds you that you don't need to know everything before beginning. Your willingness to learn may be more valuable than having every skill already mastered, especially if you've been waiting for the perfect moment to make a change.",
      ],
      advice: "Start before you feel completely ready. Take one practical step toward the new direction and allow experience to teach you the rest.",
    },
    pets: {
      summary: [
        "Your bond with your pet benefits from a little spontaneity today. A different walking route, a new game, or simply allowing more time for exploration can bring fresh energy into your shared routine. Your pet may also respond especially well to your playful side. Small changes can create memorable moments and strengthen the trust between you.",
      ],
      advice: "Try something new together today. Let your pet explore, play, and enjoy a little freedom from the usual routine.",
    },
    health: {
      summary: [
        "Your wellbeing may benefit from approaching things with a beginner's mindset. Instead of trying to completely transform your lifestyle, consider experimenting with one small habit that feels realistic and enjoyable. The Fool suggests that progress doesn't require perfection. A fresh perspective may help you reconnect with your body and discover an approach that feels easier to maintain.",
      ],
      advice: "Start fresh and keep it simple. Choose one small healthy habit today without putting pressure on yourself to be perfect.",
    },
  },

  magician: {
    love: {
      summary: [
        "You have more influence over your love life than you may realize today. Your communication, confidence, and willingness to be honest can significantly shape the direction of a relationship. If there is something you've been wanting to say, this is a strong moment to express it clearly rather than hoping the other person will guess. The Magician encourages you to use your voice and presence intentionally.",
      ],
      advice: "Say what you actually mean. Clear communication and honest intentions can create the response you've been hoping for.",
    },
    finance: {
      summary: [
        "The Magician suggests that you already possess many of the tools needed to improve your financial situation. Instead of endlessly researching or waiting for ideal circumstances, focus on turning one of your ideas into a concrete action. Your skills, knowledge, creativity, or existing resources may be more valuable than you realize. Progress begins when you start using what is already available to you.",
      ],
      advice: "Use what you already have. Turn one financial idea into a concrete action today instead of waiting for the perfect opportunity.",
    },
    career: {
      summary: [
        "This is a powerful day for initiative and self-expression at work. You may have the ability to influence a project, present an idea, solve a difficult problem, or demonstrate a skill that others have overlooked. The Magician favors people who act rather than wait for permission. Trust your ability to bring different resources together and make something happen.",
      ],
      advice: "Make the first move. Put your idea forward, communicate your strengths, and show others what you can create.",
    },
    pets: {
      summary: [
        "Your pet is likely to respond well to focused attention and consistent training today. The Magician represents skill and intention, making this a good moment to teach a command, reinforce a positive behavior, or introduce a mentally stimulating activity. Your patience and consistency can make a noticeable difference.",
      ],
      advice: "Teach with intention. Spend a few focused minutes training or playing a mentally stimulating game with your pet.",
    },
    health: {
      summary: [
        "The Magician reminds you that meaningful changes often begin with actions you can take immediately. You may already know which habits support your wellbeing, but the missing piece could simply be follow-through. Rather than waiting for motivation to appear, create a small action that makes the healthier choice easier to repeat.",
      ],
      advice: "Act instead of waiting. Choose one healthy action you can take immediately and build momentum from there.",
    },
  },

  high_priestess: {
    love: {
      summary: [
        "Not everything about a relationship is visible on the surface today. You may sense something beneath the words being spoken, or feel that an important part of the situation has not yet revealed itself. The High Priestess encourages patience and emotional awareness. Instead of immediately demanding answers, pay attention to what your intuition is telling you and allow the situation to unfold naturally.",
      ],
      advice: "Listen to the quiet signal. Give yourself time to understand what you truly feel before looking for answers from someone else.",
    },
    finance: {
      summary: [
        "A financial decision may contain details that you have not fully uncovered yet. There could be information, conditions, or consequences that are easy to overlook when you're focused on the obvious opportunity. The High Priestess favors research, observation, and patience rather than impulsive action. Waiting for the full picture can protect you from making a decision based on incomplete information.",
      ],
      advice: "Wait for the full picture. Check the details carefully and gather more information before making an important financial commitment.",
    },
    career: {
      summary: [
        "There may be more happening behind the scenes at work than what is being openly discussed. You could notice subtle changes in people's behavior, priorities, or communication. The High Priestess suggests that observation is more valuable than speaking too quickly today. Pay attention to patterns and trust your ability to notice what others may overlook.",
      ],
      advice: "Read between the lines. Observe carefully today and let the hidden information become clearer before making your next move.",
    },
    pets: {
      summary: [
        "Your pet may be communicating something through subtle changes in behavior rather than obvious signals. A change in mood, appetite, energy, or reaction to the environment could be worth paying attention to. The High Priestess encourages you to slow down and observe rather than immediately assuming you know what is happening.",
      ],
      advice: "Trust your observations. If something about your pet feels different today, slow down and pay closer attention.",
    },
    health: {
      summary: [
        "Your body may be giving you a quiet signal that deserves more attention. Sometimes wellbeing communicates through subtle changes in energy, mood, comfort, or daily patterns before anything becomes obvious. The High Priestess encourages awareness rather than panic. Notice what is different, give yourself space to reflect, and avoid ignoring persistent concerns.",
      ],
      advice: "Listen to your body. Pay attention to subtle signals and give yourself permission to slow down and notice what you need.",
    },
  },

  empress: {
    love: {
      summary: [
        "Warmth, affection, and emotional abundance are flowing through your relationships today. The Empress encourages you to create an atmosphere where both you and the people you love feel cared for and appreciated. If you're dating, genuine kindness may be more attractive than trying to impress someone. If you're partnered, small acts of affection can deepen the feeling of security and connection.",
      ],
      advice: "Give generously. Show someone you love that you care through a small, sincere act of affection or kindness.",
    },
    finance: {
      summary: [
        "The Empress points toward steady financial growth rather than quick wins. Something you've been nurturing may gradually become more valuable, especially if you continue giving it consistent attention. This is a good reminder that financial stability is often built through repeated small choices rather than dramatic moves. Think about what you can nurture today that will benefit you later.",
      ],
      advice: "Nurture, don't rush. Put some attention or resources toward a long-term financial goal instead of chasing a quick result.",
    },
    career: {
      summary: [
        "Your creativity, empathy, and ability to help others are particularly valuable today. A project may benefit from your patience and willingness to develop an idea carefully instead of forcing immediate results. You may also find that supporting a colleague creates stronger professional relationships and opportunities later. Growth is happening through consistency and care.",
      ],
      advice: "Grow something today. Invest your attention in a project, relationship, or idea that has the potential to flourish over time.",
    },
    pets: {
      summary: [
        "Your pet is likely to appreciate comfort, affection, and relaxed companionship today. The Empress represents nurturing energy, making this a wonderful day for extra cuddles, grooming, treats, or simply spending peaceful time together. Your pet doesn't necessarily need an exciting adventure; your presence and care may be what matters most.",
      ],
      advice: "Lean into comfort. Give your pet some extra affection and create a calm, cozy moment together.",
    },
    health: {
      summary: [
        "Your body may respond better to nourishment and gentleness than strict discipline today. The Empress encourages you to think about wellbeing as something you cultivate rather than something you force. Rest, nourishing food, hydration, comfort, and emotional care can all be valuable forms of self-support. You don't have to earn the right to take care of yourself.",
      ],
      advice: "Nourish, don't push. Choose one gentle and genuinely supportive thing you can do for your body today.",
    },
  },

  emperor: {
    love: {
      summary: [
        "Stability, boundaries, and emotional security are important themes in your relationships today. Romance may be less about dramatic gestures and more about demonstrating that you can be dependable. If there is an issue you've been avoiding, a calm and structured conversation could help establish healthier expectations. Strong relationships need both warmth and clear boundaries.",
      ],
      advice: "Bring structure, not force. Set the boundary you've been avoiding and communicate it calmly and clearly.",
    },
    finance: {
      summary: [
        "The Emperor strongly favors financial discipline and structure today. Reviewing your budget, organizing expenses, or creating a clearer long-term plan can give you a greater sense of control. This isn't a day for emotional spending or decisions made simply because something looks exciting. Stability comes from knowing where your money is going.",
      ],
      advice: "Build the structure. Review your budget, organize your priorities, and make one practical decision that strengthens your financial foundation.",
    },
    career: {
      summary: [
        "Leadership and decisive action are highlighted in your professional life. You may find yourself in a situation where others are waiting for direction or where a difficult decision can no longer be postponed. The Emperor encourages confidence without unnecessary aggression. Take responsibility, communicate expectations clearly, and create structure where there is confusion.",
      ],
      advice: "Take the lead. Make the decision you've been avoiding and give the people around you clear direction.",
    },
    pets: {
      summary: [
        "Consistency is especially important for your pet today. A predictable routine can help them feel safe and understand what is expected of them. If you've been inconsistent with boundaries or training, this is a good moment to return to a clear and calm structure. Firmness works best when it is paired with patience.",
      ],
      advice: "Hold the routine. Keep expectations consistent and give your pet clear, calm boundaries today.",
    },
    health: {
      summary: [
        "Your wellbeing may benefit from returning to structure and routine. If you've recently been inconsistent with sleep, movement, meals, or other healthy habits, today favors getting back on track without making the process overly complicated. Discipline does not need to mean punishment. A reliable routine can actually create more freedom and stability.",
      ],
      advice: "Keep the routine. Follow through on one healthy commitment today, even if your motivation isn't especially strong.",
    },
  },

  hierophant: {
    love: {
      summary: [
        "Commitment, shared values, and trusted guidance are highlighted in your relationships today. You may be thinking more seriously about what a lasting relationship means to you, or considering whether your connection is aligned with your deeper values. Advice from someone experienced may also help you see a situation more clearly. Sometimes traditional wisdom has value precisely because it has been tested over time.",
      ],
      advice: "Honor what works. Consider the advice of someone you trust and think about which relationship values matter most to you.",
    },
    finance: {
      summary: [
        "The Hierophant favors established financial methods over risky experimentation. A proven budgeting system, professional guidance, or a conventional approach may serve you better than chasing something that promises unusually fast results. Today is about building reliable foundations and learning from knowledge that has already been tested.",
      ],
      advice: "Trust the tested path. Use established financial principles and seek qualified guidance when you need a second perspective.",
    },
    career: {
      summary: [
        "Mentorship and institutional knowledge can be especially useful today. Someone with more experience may have already encountered the problem you're dealing with and can help you avoid unnecessary mistakes. The Hierophant also encourages you to learn the established process before deciding whether it needs to be changed.",
      ],
      advice: "Seek out guidance. Ask a mentor or experienced colleague what they would do before making your next major career decision.",
    },
    pets: {
      summary: [
        "Established routines and proven training methods are likely to work best with your pet today. Rather than constantly changing approaches, consistency can help reinforce what your pet already understands. If you've been struggling with a behavior, returning to a trusted method may be more effective than trying something completely new.",
      ],
      advice: "Stick with what works. Use the training approach that has already shown positive results and give it time to become consistent.",
    },
    health: {
      summary: [
        "The Hierophant favors established and reliable approaches to wellbeing. If you've been considering an unusual health trend or drastic change, this card suggests taking a more grounded approach. Routine care, trusted professional advice, and habits with a solid track record may offer more value than constantly searching for something new.",
      ],
      advice: "Follow established advice. Choose a reliable approach to your wellbeing and seek appropriate professional guidance when needed.",
    },
  },

  the_lovers: {
    love: {
      summary: [
        "The Lovers brings a powerful theme of connection, choice, and emotional alignment to your love life today. This isn't only about romance or attraction; it is about whether a relationship reflects who you genuinely are and what you value. You may find yourself considering an important choice about a person or relationship. Pay attention to where you feel most authentic and understood.",
      ],
      advice: "Choose with your whole self. Let your values guide your relationship decisions instead of outside pressure or expectations.",
    },
    finance: {
      summary: [
        "A financial decision may involve two different paths, or possibly another person whose needs and values affect the choice. The Lovers reminds you that money decisions are not always purely mathematical. Consider whether the option you're choosing reflects your priorities, relationships, and long-term values rather than simply what seems easiest today.",
      ],
      advice: "Choose in alignment. Make the financial decision that genuinely reflects your values, not just the most convenient option.",
    },
    career: {
      summary: [
        "You may be standing between two career directions, opportunities, projects, or professional relationships. The Lovers suggests that the most attractive option isn't necessarily the best one. Look beyond status or appearance and consider which path actually fits your values, strengths, and desired future. A choice made from alignment can be more fulfilling than one made purely from ambition.",
      ],
      advice: "Pick the aligned path. Choose the opportunity that fits who you really are, not simply the one that looks impressive from the outside.",
    },
    pets: {
      summary: [
        "Your relationship with your pet is highlighted as a bond built on trust, loyalty, and mutual companionship. Today may bring an opportunity to make a thoughtful decision on your pet's behalf or simply deepen the connection you already share. Pay attention to what your pet communicates through their behavior and let genuine care guide your choices.",
      ],
      advice: "Choose with care. When making a decision for your pet today, let their wellbeing and your bond guide you.",
    },
    health: {
      summary: [
        "You may be weighing different approaches to your wellbeing today. The Lovers asks you to consider what genuinely fits your body, lifestyle, and personal values rather than automatically choosing what is popular or expected. The best approach is often the one you can honestly maintain and that makes sense for your individual circumstances.",
      ],
      advice: "Choose what aligns. Select the healthy option that genuinely fits your needs instead of following someone else's expectations.",
    },
  },

  chariot: {
    love: {
      summary: [
        "Determination and forward movement are strong in your love life today. If you've been stuck between hesitation and action, the Chariot suggests that clarity may come from choosing a direction and moving forward. This doesn't mean forcing another person or controlling the outcome. It means taking responsibility for your own intentions and refusing to remain trapped in indecision.",
      ],
      advice: "Drive it forward. Stop circling the decision and take one confident step toward the relationship direction you truly want.",
    },
    finance: {
      summary: [
        "Focused effort can make meaningful progress toward a financial goal today. The Chariot is less about luck and more about determination, discipline, and staying on course when distractions appear. You may not see immediate results, but consistent effort can move you closer to the outcome you're aiming for.",
      ],
      advice: "Stay the course. Keep working toward your financial goal and avoid distractions that pull you away from your plan.",
    },
    career: {
      summary: [
        "Ambition and momentum are strongly favored in your career today. If you've been waiting for the right opportunity to push a project forward, this is a good moment to take initiative. Your ability to stay focused can give you an advantage, especially when others become distracted. Direct your energy toward the result that matters most.",
      ],
      advice: "Push through. Tackle the task requiring the most determination today and keep your attention on the goal.",
    },
    pets: {
      summary: [
        "Your pet may have plenty of physical and mental energy today. An active walk, training session, outdoor adventure, or stimulating game can help channel that energy positively. Shared movement can also strengthen your bond and make your pet feel more engaged and satisfied.",
      ],
      advice: "Get moving together. Give your pet an active outlet today through exercise, play, or an adventure outside.",
    },
    health: {
      summary: [
        "The Chariot brings motivation, discipline, and forward momentum to your wellbeing. If you've been procrastinating on a healthy goal, today may provide the determination needed to get moving again. Focus on progress rather than perfection, and remember that consistency is more important than one extremely difficult effort.",
      ],
      advice: "Push forward. Follow through on one health goal today and use the momentum to rebuild consistency.",
    },
  },

  strength: {
    love: {
      summary: [
        "Strength reminds you that emotional power does not have to look like control. A relationship may test your patience today, but responding with calmness and compassion can create a better result than trying to force things into place. You may discover that gentleness is actually the strongest response when emotions are intense.",
      ],
      advice: "Soften, don't force. Meet relationship tension with patience and calm communication instead of trying to control the outcome.",
    },
    finance: {
      summary: [
        "A financial temptation or worry may test your emotional discipline today. You may feel an urge to make a quick decision simply to relieve uncertainty, but Strength encourages you to pause and regain perspective. Staying calm can prevent a temporary emotion from turning into a financial choice you'll later regret.",
      ],
      advice: "Stay steady. Give yourself time before making an emotional financial decision and let the pressure settle.",
    },
    career: {
      summary: [
        "A difficult professional situation may require more patience than force today. Someone could challenge you, a project may move slower than expected, or frustration may build beneath the surface. Strength suggests that maintaining composure will give you more influence than reacting aggressively. Quiet confidence can be more powerful than confrontation.",
      ],
      advice: "Lead with patience. Stay calm when you're challenged and respond thoughtfully rather than reacting in the heat of the moment.",
    },
    pets: {
      summary: [
        "Your pet may test your patience through stubbornness, excitement, or a training setback today. Strength reminds you that fear or frustration rarely creates the bond you want. Gentle repetition and calm guidance can help your pet learn while preserving their trust in you.",
      ],
      advice: "Be gently persistent. Stay patient with your pet and use calm repetition instead of frustration or harshness.",
    },
    health: {
      summary: [
        "Strength encourages patience with your own body and progress. You may feel tempted to push harder because you believe more effort will produce faster results, but today favors listening and moderation. Real resilience includes knowing when to rest, adjust, and give yourself time rather than treating every challenge as something to overcome by force.",
      ],
      advice: "Be patient with yourself. Give your body the time and care it needs instead of forcing progress when you need gentleness.",
    },
  },

  hermit: {
    love: {
      summary: [
        "A little solitude may actually help your relationships today. The Hermit encourages you to step away from outside opinions and reflect on what you genuinely want from your emotional life. If a relationship situation feels complicated, taking time before responding can help you separate your true feelings from temporary emotions or other people's expectations.",
      ],
      advice: "Take space to reflect. Give yourself quiet time before making an important relationship decision or responding emotionally.",
    },
    finance: {
      summary: [
        "The Hermit suggests stepping away from financial noise and taking an honest look at your situation privately. Rather than comparing yourself with other people's spending or success, focus on your own numbers, goals, and priorities. A quiet review can reveal something important that gets lost when you're distracted by outside opinions.",
      ],
      advice: "Review in quiet. Sit down with your finances without distractions and honestly assess where you stand.",
    },
    career: {
      summary: [
        "You may gain more from uninterrupted thinking than from another meeting or conversation today. The Hermit encourages independent reflection and careful analysis. If you're facing a professional problem, give yourself enough quiet space to understand it fully before asking everyone else what they think.",
      ],
      advice: "Think it through alone. Create some uninterrupted time to work through the problem and find your own perspective.",
    },
    pets: {
      summary: [
        "A peaceful and low-stimulation day may suit your pet especially well. Not every day needs to be filled with activities or adventures. Quiet companionship, rest, and a familiar environment can help your pet feel secure and content, especially if they've recently experienced a lot of excitement.",
      ],
      advice: "Keep it quiet. Give your pet a calm day with plenty of rest and peaceful companionship.",
    },
    health: {
      summary: [
        "Your body and mind may benefit from slowing down today. The Hermit suggests that constant activity isn't always productive and that quiet time can help you recognize what you actually need. Creating space for rest, reflection, and recovery may be more beneficial than forcing yourself to stay busy.",
      ],
      advice: "Rest in solitude. Give yourself genuine quiet time today instead of filling every moment with activity.",
    },
  },

  wheel_of_fortune: {
    love: {
      summary: [
        "The Wheel of Fortune signals movement and change in your love life. A relationship dynamic that has felt predictable may suddenly shift, opening the door to a new phase. If you're single, an unexpected encounter or change in circumstances could alter your romantic direction. You cannot control every turn of the wheel, but you can decide how open you are to what comes next.",
      ],
      advice: "Go with the flow. Stay flexible and allow relationship changes to unfold instead of trying to control every outcome.",
    },
    finance: {
      summary: [
        "Your financial situation may be approaching a turning point. A change in income, expenses, opportunity, or circumstances could alter the direction you've recently been experiencing. The Wheel of Fortune reminds you that financial cycles naturally change. Stay flexible and be prepared to adapt rather than assuming today's circumstances will last forever.",
      ],
      advice: "Ride the shift. Stay flexible with your money and be ready to adjust your plan as circumstances change.",
    },
    career: {
      summary: [
        "A professional cycle may be turning in a new direction. An unexpected opportunity, change in responsibilities, new project, or shift in timing could appear when you least expect it. The Wheel of Fortune favors preparation because opportunities often arrive quickly. Keep your eyes open and don't become too attached to one specific outcome.",
      ],
      advice: "Stay ready for the turn. Watch for unexpected opportunities and be prepared to act when circumstances shift.",
    },
    pets: {
      summary: [
        "Something about your usual routine with your pet may change unexpectedly today. A schedule adjustment, visitor, new environment, or unplanned event could require flexibility. Your pet may take emotional cues from you, so staying calm and adaptable can help them adjust more easily.",
      ],
      advice: "Adapt as you go. If plans change today, keep your response calm and flexible so your pet feels secure.",
    },
    health: {
      summary: [
        "The Wheel of Fortune suggests that your wellbeing may be entering a period of change. You may notice a shift in energy, motivation, habits, or the way your body responds to your routine. Not every change needs to be immediately explained. Pay attention to patterns and allow yourself to adjust your approach as new information appears.",
      ],
      advice: "Trust the cycle. Notice what's changing and let that information guide your next small and practical step.",
    },
  },

  justice: {
    love: {
      summary: [
        "Honesty, fairness, and accountability are at the heart of your relationships today. A situation may require you to look at both sides instead of simply deciding who is right or wrong. If there has been an unresolved issue, a clear conversation can help restore balance. The goal isn't to win; it is to create an understanding that both people can genuinely stand behind.",
      ],
      advice: "Be fair and honest. Have the conversation openly and make space for both your perspective and the other person's.",
    },
    finance: {
      summary: [
        "Justice asks you to take an objective look at your financial situation today. There may be an imbalance that needs correcting, such as an unpaid obligation, an unfair split, an overlooked expense, or a decision you've been avoiding. Clear numbers and honest assessment will help you regain control more effectively than wishful thinking.",
      ],
      advice: "Balance the books. Look honestly at the financial imbalance and take one concrete step to correct it.",
    },
    career: {
      summary: [
        "A professional decision may require fairness and clear judgment today. Questions around responsibility, recognition, credit, or conflict may need to be handled objectively rather than emotionally. Justice encourages you to consider evidence and consequences carefully. Doing what is fair may not always be the easiest option, but it can protect your integrity.",
      ],
      advice: "Judge it fairly. Make the decision that is most balanced and defensible, even if it isn't the easiest choice.",
    },
    pets: {
      summary: [
        "A decision about your pet's routine, care, or responsibilities may benefit from a balanced approach today. Consider what is genuinely best for your pet rather than acting from guilt, convenience, or emotion alone. Looking carefully at the situation can help you make a more thoughtful choice.",
      ],
      advice: "Weigh it carefully. Consider all sides of the situation before deciding what is best for your pet.",
    },
    health: {
      summary: [
        "Justice brings balance to your approach to wellbeing. It may be time to honestly evaluate a habit without becoming overly strict or overly forgiving. Instead of swinging between extremes, look at what your current routine is actually producing and make a reasonable adjustment based on that information.",
      ],
      advice: "Find the balance. Take an honest look at one habit and make a practical adjustment rather than going to an extreme.",
    },
  },

  hanged_man: {
    love: {
      summary: [
        "A relationship matter may benefit from a pause rather than immediate action. The Hanged Man suggests that what feels like stagnation could actually be giving you time to see the situation from a completely different perspective. If you're waiting for clarity, forcing an answer may only create more confusion. Sometimes stepping back allows the truth to become easier to recognize.",
      ],
      advice: "Pause before you push. Give the situation more time and allow a new perspective to develop naturally.",
    },
    finance: {
      summary: [
        "A financial decision may be better left alone temporarily. You might be missing an important detail, alternative option, or consequence that becomes clearer with time. The Hanged Man doesn't necessarily mean doing nothing forever; it suggests deliberately creating space before committing to something significant.",
      ],
      advice: "Wait it out. If possible, delay the decision and use the extra time to look at the situation from another angle.",
    },
    career: {
      summary: [
        "A professional project may feel stalled, but the pause could contain useful information. Instead of forcing progress simply to feel productive, step back and examine the problem differently. You may discover that the obstacle is pointing toward a solution you would have missed if you kept pushing in the same direction.",
      ],
      advice: "See it differently. Stop forcing progress for a moment and look at the problem from a completely different perspective.",
    },
    pets: {
      summary: [
        "If something with your pet feels unresolved, patience may be more helpful than constantly trying new solutions. Your pet may need time to adjust to a situation, learn a behavior, or become comfortable with a change. Give the process room instead of expecting immediate results.",
      ],
      advice: "Let it rest a moment. Give your pet more time and avoid forcing a solution before they're ready.",
    },
    health: {
      summary: [
        "The Hanged Man encourages you to respect the natural pace of recovery and change. You may be tempted to rush results or become frustrated because progress isn't happening as quickly as you expected. Sometimes the most productive thing you can do is stop pushing and allow your body the time it needs.",
      ],
      advice: "Let recovery take time. Resist the urge to rush your progress and give yourself room to recover at your own pace.",
    },
  },

  temperance: {
    love: {
      summary: [
        "Balance and patience can bring harmony to your relationships today. You may be dealing with two different needs, personalities, or perspectives, but neither side has to completely win. Temperance encourages compromise without asking you to abandon your own values. A calm middle ground can create more lasting peace than trying to prove a point.",
      ],
      advice: "Blend, don't force. Look for a middle ground that respects both your needs and the needs of the person you care about.",
    },
    finance: {
      summary: [
        "Moderation is the strongest financial theme today. Instead of swinging between extreme saving and unnecessary spending, aim for a sustainable middle ground. A small amount of enjoyment does not have to destroy your financial goals, just as constant restriction may not be realistic. Balance is what makes a financial plan easier to maintain.",
      ],
      advice: "Find the middle ground. Balance your financial priorities with reasonable enjoyment instead of choosing an extreme.",
    },
    career: {
      summary: [
        "Your ability to mediate, combine different approaches, and remain calm can be especially valuable at work today. If two people or teams disagree, you may be able to identify the useful parts of both perspectives. Temperance favors cooperation over competition and suggests that patience can turn a difficult situation into a productive one.",
      ],
      advice: "Mediate with patience. Bring a calm, balanced perspective to disagreements and help create a practical compromise.",
    },
    pets: {
      summary: [
        "Your pet benefits from a steady and balanced routine today. Too much stimulation can be overwhelming, while too little activity may leave them restless. Temperance encourages you to find the right rhythm between exercise, play, food, rest, and affection. Consistency can help your pet feel secure.",
      ],
      advice: "Keep it balanced. Aim for a comfortable mix of activity, rest, play, and quiet time with your pet.",
    },
    health: {
      summary: [
        "Temperance encourages a moderate and sustainable approach to wellbeing. You don't need to completely overhaul your lifestyle or follow an all-or-nothing routine. Small adjustments to food, movement, sleep, stress, and rest can work together more effectively than extreme changes. Your goal today is harmony rather than perfection.",
      ],
      advice: "Aim for balance. Choose the moderate and sustainable option instead of pushing yourself toward an extreme.",
    },
  },

  devil: {
    love: {
      summary: [
        "The Devil asks you to look honestly at an attachment or relationship pattern that may have more control over you than you'd like. This doesn't automatically mean a relationship is unhealthy; it means there may be habits, fears, jealousy, dependency, or repeated behaviors worth examining. Recognizing the pattern is the first step toward deciding whether it still deserves your energy.",
      ],
      advice: "Notice the pattern. Be honest with yourself about one relationship habit that keeps you feeling stuck or powerless.",
    },
    finance: {
      summary: [
        "A financial temptation may be stronger than usual today. The Devil can point toward spending habits, impulsive purchases, debt patterns, or the desire to use money as emotional comfort. The important thing is not to judge yourself but to recognize the cycle. Once you can see the trigger, you have more power to choose differently.",
      ],
      advice: "Name the temptation. Before spending impulsively, pause and ask whether you're making a conscious choice or repeating a familiar habit.",
    },
    career: {
      summary: [
        "You may be feeling trapped by a professional pattern that has gradually become normal. Overwork, people-pleasing, unhealthy competition, fear of leaving, or constantly saying yes can create a sense that there is no alternative. The Devil encourages honest awareness. You don't have to solve everything today, but identifying the pattern can be the beginning of change.",
      ],
      advice: "See the trap clearly. Identify one work habit that is keeping you stuck and take one small step away from it.",
    },
    pets: {
      summary: [
        "An unhelpful habit may be developing around your pet's routine. This could involve inconsistent boundaries, excessive treats, avoidance of training, or a routine that works for you but isn't ideal for your pet. The Devil encourages awareness without guilt. Once you recognize the pattern, you can begin replacing it with something healthier.",
      ],
      advice: "Break the habit loop. Notice one routine that isn't helping you or your pet and make one small adjustment today.",
    },
    health: {
      summary: [
        "The Devil can highlight a habit that has become difficult to control. This might involve avoidance, overindulgence, unhealthy routines, or using a behavior to cope with stress. The card isn't asking you to shame yourself. It is asking you to become honest about what the pattern is costing you and where you still have the power to choose differently.",
      ],
      advice: "Face the habit honestly. Identify one pattern that isn't serving you and make one small, realistic change today.",
    },
  },

  tower: {
    love: {
      summary: [
        "The Tower can bring a sudden moment of truth to your love life. Something unexpected may challenge an assumption, reveal an important reality, or completely change the way you understand a relationship. Although this kind of clarity can feel disruptive, it can also remove something that was unstable or based on avoidance. Don't rush to repair everything immediately; first allow yourself to understand what has actually changed.",
      ],
      advice: "Let the truth land. Give yourself time to process an unexpected relationship development before trying to immediately fix it.",
    },
    finance: {
      summary: [
        "An unexpected financial disruption may require your attention today. It could be an expense, a realization about your finances, or a situation that exposes weaknesses in your current plan. The Tower can feel uncomfortable because it removes the illusion that everything is stable, but it also creates an opportunity to rebuild more honestly. Face the situation directly instead of avoiding it.",
      ],
      advice: "Rebuild on solid ground. Address the unexpected financial issue directly and use what you learn to strengthen your plan.",
    },
    career: {
      summary: [
        "A sudden change at work may disrupt your expectations today. Plans can shift, priorities can change, or an outcome may be very different from what you anticipated. The Tower reminds you that not every structure deserves to remain standing. Once the initial shock passes, look carefully at what the change makes possible rather than spending all your energy trying to restore the old plan.",
      ],
      advice: "Let the old structure fall. Accept what has changed and focus your energy on deciding what should be built next.",
    },
    pets: {
      summary: [
        "An unexpected disruption could affect your pet's routine today. A visitor, schedule change, unusual environment, or other surprise may temporarily unsettle them. Your pet may look to you for emotional cues, so staying calm and maintaining familiar elements can help them adjust. The disruption does not have to define the whole day.",
      ],
      advice: "Stay calm through the shake-up. Keep your response steady and give your pet familiar comfort while the situation settles.",
    },
    health: {
      summary: [
        "The Tower can symbolize a sudden wake-up call that makes you pay closer attention to your wellbeing. Something may interrupt your normal routine or make you realize that an issue deserves more attention than you've been giving it. Rather than ignoring the signal or immediately assuming the worst, treat it as information that deserves an appropriate response.",
      ],
      advice: "Heed the wake-up call. Pay attention to significant changes in how you feel and respond thoughtfully rather than simply pushing through.",
    },
  },

  the_star: {
    love: {
      summary: [
        "The Star brings hope, healing, and emotional renewal to your love life. If you've recently experienced disappointment, distance, or uncertainty, this card suggests that your ability to trust and connect can gradually return. You don't need to force a romantic outcome. Let hope rebuild naturally and focus on creating relationships that feel honest, peaceful, and emotionally nourishing.",
      ],
      advice: "Trust the timing. Let hope work quietly and give relationships the space they need to heal and grow naturally.",
    },
    finance: {
      summary: [
        "The Star suggests that your financial outlook can gradually improve after a difficult period. You may not see a dramatic transformation immediately, but small positive choices can restore confidence and stability. This is a good time to reconnect with a financial goal that still matters to you and take a realistic step toward it.",
      ],
      advice: "Take the hopeful step. Put a little effort toward a meaningful financial goal and trust that small progress can accumulate.",
    },
    career: {
      summary: [
        "A renewed sense of hope or inspiration may return to your professional life. If you've recently felt discouraged, overlooked, or uncertain about your direction, The Star reminds you that one difficult period does not define your entire career. Reconnect with the vision that originally motivated you and let that sense of purpose guide your next move.",
      ],
      advice: "Reconnect with the vision. Return to a career goal that still inspires you and take one small step toward it today.",
    },
    pets: {
      summary: [
        "The Star brings a gentle and reassuring energy to your relationship with your pet. Today is well suited to comfort, healing, quiet companionship, and appreciation. If you or your pet have been through a stressful period, simple moments of safety and connection can be more meaningful than doing anything elaborate.",
      ],
      advice: "Appreciate the good moments. Spend some peaceful time with your pet and notice the comfort your bond brings.",
    },
    health: {
      summary: [
        "The Star is traditionally associated with hope and healing. If you've been working through a difficult period, today's message is to recognize that progress can happen gradually even when it isn't immediately visible. Give yourself permission to recover at a realistic pace and focus on supportive habits rather than demanding instant results.",
      ],
      advice: "Trust the healing process. Give yourself supportive rest and care today without expecting everything to improve immediately.",
    },
  },

  moon: {
    love: {
      summary: [
        "Your emotional landscape may feel unusually unclear today. You could receive a confusing signal from someone, experience changing feelings, or find yourself wondering whether you're seeing a situation accurately. The Moon suggests that not every fear or assumption deserves immediate belief. Give yourself time to separate intuition from anxiety before making a major relationship decision.",
      ],
      advice: "Don't trust the first read. Give confusing relationship signals time to become clearer before reacting.",
    },
    finance: {
      summary: [
        "Something about a financial situation may not be as straightforward as it first appears. Hidden fees, unclear terms, unrealistic expectations, or incomplete information could influence the outcome. The Moon encourages careful checking rather than fear. You don't need to assume something is wrong, but you should make sure you understand what you're agreeing to.",
      ],
      advice: "Look twice before deciding. Verify the details and make sure you understand the full financial picture before committing.",
    },
    career: {
      summary: [
        "Unclear communication or office politics may make your professional environment feel difficult to read today. You may not have enough information to understand someone's intentions or predict where a decision is heading. The Moon suggests resisting the urge to fill gaps with assumptions. Wait for clearer evidence before making an important move.",
      ],
      advice: "Wait for clarity. Avoid making a major career decision while the situation is still confusing or incomplete.",
    },
    pets: {
      summary: [
        "Your pet's behavior may be harder to interpret than usual today. They may seem unusually restless, withdrawn, sensitive, or unpredictable. Instead of immediately assigning a reason to the behavior, observe the circumstances around it. Changes in environment, routine, or stimulation may explain more than you initially realize.",
      ],
      advice: "Observe before assuming. Watch your pet carefully and look for patterns instead of jumping to conclusions about their behavior.",
    },
    health: {
      summary: [
        "Your body's signals may feel confusing or inconsistent today. A vague sensation, shifting energy, or emotional change can be difficult to interpret immediately. The Moon encourages patience rather than catastrophizing. Pay attention to what persists or changes, and avoid drawing a major conclusion from one unclear moment.",
      ],
      advice: "Give it time to clarify. Notice what changes and avoid jumping to conclusions about a vague or temporary signal.",
    },
  },

  the_sun: {
    love: {
      summary: [
        "The Sun brings warmth, openness, and genuine happiness into your relationships today. Communication can feel easier, affection more natural, and shared moments more enjoyable. If you've been overthinking where a relationship is going, this card encourages you to notice the happiness that exists in the present instead of constantly analyzing the future. Authenticity is especially attractive now.",
      ],
      advice: "Let yourself enjoy it. Share your happiness openly and allow yourself to appreciate the good moments without overthinking them.",
    },
    finance: {
      summary: [
        "A positive financial development may brighten your day. This could be good news, a successful outcome, progress toward a goal, or simply a stronger sense of confidence about your situation. The Sun encourages you to acknowledge financial wins instead of immediately moving on to the next worry. Enjoy the progress while continuing to make sensible choices.",
      ],
      advice: "Enjoy the good news. Allow yourself to appreciate a financial win before immediately worrying about what comes next.",
    },
    career: {
      summary: [
        "Recognition, success, and visible progress are highlighted in your professional life. Something you've been working toward may finally receive the attention it deserves, or you may simply feel more confident about your abilities. The Sun encourages you to own your accomplishments rather than minimizing them. Let positive momentum remind you of what you're capable of.",
      ],
      advice: "Own your win. Acknowledge your progress and allow yourself to feel proud of something you've accomplished.",
    },
    pets: {
      summary: [
        "A joyful and energetic atmosphere surrounds your time with your pet today. Play, sunshine, exploration, and simple shared happiness are especially favored. Your pet may respond strongly to your positive energy, making this an ideal day to put distractions aside and genuinely enjoy being together.",
      ],
      advice: "Soak up the joy. Spend some genuinely playful time with your pet and enjoy the happiness of the moment.",
    },
    health: {
      summary: [
        "The Sun brings a bright and energetic tone to your wellbeing. You may feel more motivated, optimistic, or physically capable than you have recently. Use that energy in a way that feels enjoyable rather than turning it into pressure. Positive experiences can become part of a healthy routine when you associate wellbeing with something you genuinely like doing.",
      ],
      advice: "Enjoy your energy. Use today's positive momentum for an activity that makes you feel good rather than treating it like a punishment.",
    },
  },

  world: {
    love: {
      summary: [
        "The World suggests a sense of completion, fulfillment, or meaningful progress in your love life. A relationship may be reaching an important milestone, or you may finally feel that you've completed an emotional chapter that once felt unfinished. This card encourages you to recognize how much you've grown and to appreciate the journey rather than immediately searching for the next problem to solve.",
      ],
      advice: "Celebrate the milestone. Take a moment to appreciate how far your relationship or emotional journey has come.",
    },
    finance: {
      summary: [
        "A financial cycle may be reaching completion. You could be finishing a major project, paying off an obligation, reaching a savings milestone, or finally resolving something that has required sustained effort. The World encourages you to acknowledge the achievement before immediately setting another demanding target. Completion deserves recognition.",
      ],
      advice: "Close the chapter. Acknowledge the financial milestone you've reached and give yourself credit for the progress.",
    },
    career: {
      summary: [
        "A professional project, goal, or chapter may be approaching a satisfying conclusion. The World represents completion and integration, suggesting that the experience you've gained can now become part of your larger career story. Take time to recognize what you accomplished and what you learned before rushing into the next challenge.",
      ],
      advice: "Finish strong. Bring the current chapter to a proper close and take a moment to recognize how far you've come.",
    },
    pets: {
      summary: [
        "A sense of harmony and completion surrounds your relationship with your pet. You may notice how much you've both learned, especially if you've been working through training or adjustment together. Today is less about fixing something and more about appreciating the bond you've built through all the small moments of care.",
      ],
      advice: "Enjoy the harmony. Notice how far you and your pet have come and appreciate the ease you've created together.",
    },
    health: {
      summary: [
        "The World suggests that a wellbeing goal or personal health journey may be reaching an important milestone. A habit may finally feel natural, a period of recovery may be moving toward completion, or you may simply recognize how much progress you've made. Let this moment reinforce your confidence without feeling pressured to immediately chase another goal.",
      ],
      advice: "Acknowledge the progress. Celebrate the health milestone you've reached before deciding what you want to work toward next.",
    },
  },
};

const CATEGORY_LABELS = {
  love: "Love",
  finance: "Finance",
  career: "Career",
  pets: "Pets",
  health: "Health",
};

const CARD_IDS = Object.keys(CARDS);

/**
 * Simulates GET /api/cards/daily?category=<category>.
 *
 * Randomly draws one card and attaches the meaning that matches
 * the selected category.
 */
export function fetchDailyCard(category) {
  const cardId = CARD_IDS[Math.floor(Math.random() * CARD_IDS.length)];
  const card = CARDS[cardId];

  const selectedCategory = CATEGORY_LABELS[category]
    ? category
    : "love";

  const meaningsForCard = CARD_MEANINGS[cardId];
  const meaning = meaningsForCard[selectedCategory];

  const diaryLabel = CATEGORY_LABELS[selectedCategory];

  // Dynamic advice title based on the selected category.
  // Example:
  // Love    -> Your Advice for Love
  // Finance -> Your Advice for Finance
  // Career  -> Your Advice for Career
  // Pets    -> Your Advice for Pets
  // Health  -> Your Advice for Health
  const adviceTitle = `Your Advice for ${diaryLabel}`;

  return new Promise((resolve) => {
    window.setTimeout(
      () =>
        resolve({
          ...card,
          diaryLabel,
          summary: meaning.summary,
          adviceTitle,
          advice: meaning.advice,
          shareBlurb: shareBlurbFor(cardId, card.name),
        }),
      700
    );
  });
}
