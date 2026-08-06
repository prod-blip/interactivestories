export type InputState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  action: boolean;
  wheelBoost: number;
  moveX: number;
  moveY: number;
};

export type StoryPhase =
  | 'title'
  | 'cinematic-flight'
  | 'flight-tutorial'
  | 'find-pitcher'
  | 'pitcher-discovery'
  | 'pebble-discovery'
  | 'collecting'
  | 'carrying'
  | 'drinking-scene'
  | 'ending-flight'
  | 'moral-screen'
  | 'free-explore';
