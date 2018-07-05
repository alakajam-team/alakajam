'use strict'

/**
 * Enums
 *
 * @module core/enums
 */

module.exports = {
  EVENT: {
    STATUS: {
      PENDING: 'pending',
      OPEN: 'open',
      CLOSED: 'closed'
    },
    STATUS_RULES: {
      DISABLED: 'disabled',
      OFF: 'off'
    },
    STATUS_THEME: {
      DISABLED: 'disabled',
      OFF: 'off',
      VOTING: 'voting',
      SHORTLIST: 'shortlist',
      CLOSED: 'closed',
      RESULTS: 'results'
    },
    STATUS_ENTRY: {
      OFF: 'off',
      OPEN: 'open',
      OPEN_UNRANKED: 'open_unranked',
      CLOSED: 'closed'
    },
    STATUS_RESULTS: {
      DISABLED: 'disabled',
      OFF: 'off',
      VOTING: 'voting',
      VOTING_RESCUE: 'voting_rescue',
      RESULTS: 'results'
    },
    STATUS_TOURNAMENT: {
      DISABLED: 'disabled',
      OFF: 'off',
      SUBMISSION: 'submission',
      PLAYING: 'playing',
      CLOSED: 'closed',
      RESULTS: 'results'
    }
  },
  ENTRY: {
    STATUS_HIGH_SCORE: {
      OFF: 'off',
      NORMAL: 'normal',
      REVERSED: 'reversed'
    },
    HIGH_SCORE_TYPE: {
      NUMBER: 'number',
      TIME: 'time'
    }
  },
  THEME: {
    STATUS: {
      OUT: 'out',
      ACTIVE: 'active',
      BANNED: 'banned',
      SHORTLIST: 'shortlist',
      DUPLICATE: 'duplicate'
    }
  },
  DIVISION: {
    SOLO: 'solo',
    TEAM: 'team',
    RANKED: 'ranked',
    UNRANKED: 'unranked'
  },
  LIKES: {
    'like': { icon_unliked: 'far fa-gem', icon_liked: 'fas fa-gem', title: 'Like' }
  }
}
