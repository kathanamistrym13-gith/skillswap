// server/aiMatcher.js
// AI-integrated 2-way Mutual Skill Matching Engine

const SEMANTIC_CLUSTERS = {
  programming: ['react', 'javascript', 'js', 'node', 'nodejs', 'python', 'java', 'c++', 'html', 'css', 'typescript', 'web dev', 'web development', 'frontend', 'backend', 'fullstack', 'coding'],
  design: ['figma', 'ui', 'ux', 'ui/ux', 'design', 'graphic design', 'photoshop', 'illustrator', '3d', 'blender', 'animation'],
  languages: ['english', 'spanish', 'french', 'german', 'mandarin', 'chinese', 'japanese', 'hindi', 'italian', 'language'],
  music: ['guitar', 'piano', 'singing', 'music', 'violin', 'drums', 'audio', 'music production'],
  aiml: ['ai', 'machine learning', 'data science', 'deep learning', 'nlp', 'python', 'tensorflow', 'pytorch'],
  business: ['marketing', 'seo', 'finance', 'business', 'sales', 'management', 'startup']
};

/**
 * Calculates semantic similarity between two skill strings (0.0 to 1.0)
 */
function getSkillSimilarity(skillA, skillB) {
  if (!skillA || !skillB) return 0.0;
  
  const normA = String(skillA).toLowerCase().trim();
  const normB = String(skillB).toLowerCase().trim();

  // Exact or substring match
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  // Check cluster co-occurrence
  for (const cluster of Object.values(SEMANTIC_CLUSTERS)) {
    const hasA = cluster.some(keyword => normA.includes(keyword) || keyword.includes(normA));
    const hasB = cluster.some(keyword => normB.includes(keyword) || keyword.includes(normB));
    if (hasA && hasB) {
      return 0.75;
    }
  }

  return 0.0;
}

/**
 * Computes AI 2-Way Mutual Skill Match between current user (User A) and another user (User B).
 */
function computeUserMatch(userA, userASkills, userB, userBSkills) {
  // Use explicit 'type' field if set; fallback to level-based inference for legacy data
  const isOffer = (s) => s.type === 'offer' || (!s.type && (s.level === 'Advanced' || s.level === 'Expert'));
  const isWant  = (s) => s.type === 'want'  || (!s.type && (s.level === 'Beginner' || s.level === 'Intermediate'));

  const userAOffered = userASkills.filter(isOffer);
  const userAWanted  = userASkills.filter(isWant);

  const userBOffered = userBSkills.filter(isOffer);
  const userBWanted  = userBSkills.filter(isWant);

  // Forward match: User B teaches what User A wants to learn
  let forwardBestMatch = 0;
  let forwardPair = null;

  for (const wanted of userAWanted) {
    for (const offered of userBOffered) {
      const sim = getSkillSimilarity(wanted.name, offered.name);
      if (sim > forwardBestMatch) {
        forwardBestMatch = sim;
        forwardPair = { wanted: wanted.name, offered: offered.name };
      }
    }
  }

  // Reverse match: User A teaches what User B wants to learn
  let reverseBestMatch = 0;
  let reversePair = null;

  for (const wanted of userBWanted) {
    for (const offered of userAOffered) {
      const sim = getSkillSimilarity(wanted.name, offered.name);
      if (sim > reverseBestMatch) {
        reverseBestMatch = sim;
        reversePair = { wanted: wanted.name, offered: offered.name };
      }
    }
  }

  // Calculate composite score
  let baseScore = 0;
  let matchType = 'none';
  let matchReason = 'No direct skill overlap found.';

  const isMutual = forwardBestMatch >= 0.7 && reverseBestMatch >= 0.7;
  const isOneWayForward = forwardBestMatch >= 0.7;
  const isOneWayReverse = reverseBestMatch >= 0.7;

  if (isMutual) {
    baseScore = 85 + (forwardBestMatch + reverseBestMatch) * 6.5; // 85% - 98%
    matchType = 'mutual';
    matchReason = `2-Way Mutual Swap: You teach ${reversePair.offered} ➔ They learn ${reversePair.wanted}; They teach ${forwardPair.offered} ➔ You learn ${forwardPair.wanted}`;
  } else if (isOneWayForward) {
    baseScore = 60 + forwardBestMatch * 20; // 60% - 80%
    matchType = 'one-way-learn';
    matchReason = `They teach ${forwardPair.offered} which matches your interest in ${forwardPair.wanted}`;
  } else if (isOneWayReverse) {
    baseScore = 55 + reverseBestMatch * 20; // 55% - 75%
    matchType = 'one-way-teach';
    matchReason = `You teach ${reversePair.offered} which matches their interest in ${reversePair.wanted}`;
  } else {
    // General exploration match
    baseScore = 30 + Math.random() * 15;
  }

  // Boost for high rating / active swapper
  const ratingBonus = ((userB.rating || 5.0) - 4.0) * 3; // up to 3 points
  
  // Smart Partner Recommendations Boost (Timezone, Availability, Communication)
  let compatibilityBonus = 0;
  let compatibilityReasons = [];

  if (userA.timezone && userB.timezone && userA.timezone === userB.timezone) {
    compatibilityBonus += 2;
    compatibilityReasons.push('Same timezone');
  }
  if (userA.availability && userB.availability && userA.availability !== 'Flexible' && userA.availability === userB.availability) {
    compatibilityBonus += 3;
    compatibilityReasons.push('Matching availability');
  }
  if (userA.communicationStyle && userB.communicationStyle && userA.communicationStyle === userB.communicationStyle) {
    compatibilityBonus += 2;
    compatibilityReasons.push('Similar communication style');
  }

  if (compatibilityReasons.length > 0) {
    matchReason += ` (+ ${compatibilityReasons.join(', ')})`;
  }

  const finalScore = Math.min(99, Math.round(baseScore + Math.max(0, ratingBonus) + compatibilityBonus));

  return {
    userId: userB.id,
    matchScore: finalScore,
    matchType,
    isMutual,
    matchReason,
    forwardPair,
    reversePair
  };
}

/**
 * Ranks all potential user matches for a target user using the AI algorithm
 */
function rankUserMatches(targetUser, allUsers, skillsByUserId) {
  const targetUserSkills = skillsByUserId[targetUser.id] || [];

  const rankings = allUsers
    .filter(u => u.id !== targetUser.id)
    .map(otherUser => {
      const otherSkills = skillsByUserId[otherUser.id] || [];
      const matchDetails = computeUserMatch(targetUser, targetUserSkills, otherUser, otherSkills);
      return {
        user: otherUser,
        skills: otherSkills,
        ...matchDetails
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return rankings;
}

module.exports = {
  getSkillSimilarity,
  computeUserMatch,
  rankUserMatches
};
