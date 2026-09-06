export type StoryAccessReason = 'included' | 'purchase' | 'subscription';

export type StoryAccess = {
  unlocked: boolean;
  reason: StoryAccessReason;
};

export interface StoryAccessProvider {
  getStoryAccess(storyId: string): Promise<StoryAccess>;
}

/**
 * Phase-one access provider. Every bundled story is intentionally available.
 * A Play Billing-backed provider can replace this implementation later without
 * coupling purchase state to a game or to the story catalog UI.
 */
export const storyAccessProvider: StoryAccessProvider = {
  async getStoryAccess() {
    return { unlocked: true, reason: 'included' };
  },
};
