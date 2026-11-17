import { largestStationCluster, replayStationGains } from './station-clusters';

describe('replayStationGains', () => {
  it('tells the new stations and the growth of the largest network of each activity', () => {
    const links: [number, number][] = [
      [1, 2],
      [2, 3],
      [4, 5],
    ];
    expect(
      replayStationGains(
        [
          { stationId: 1, activityId: 'a' },
          { stationId: 4, activityId: 'b' },
          { stationId: 5, activityId: 'b' },
          { stationId: 3, activityId: 'c' },
          { stationId: 2, activityId: 'd' },
        ],
        links,
      ),
    ).toEqual([
      { activityId: 'a', stations: 1, maxCluster: 1 },
      { activityId: 'b', stations: 2, maxCluster: 1 },
      { activityId: 'c', stations: 1, maxCluster: 0 },
      { activityId: 'd', stations: 1, maxCluster: 1 },
    ]);
  });

  it('ends on the largest network of every station', () => {
    const gains = replayStationGains(
      [3, 1, 2].map((stationId, i) => ({ stationId, activityId: `${i}` })),
      [
        [1, 2],
        [2, 3],
      ],
    );
    expect(gains.reduce((total, gain) => total + gain.maxCluster, 0)).toBe(3);
  });
});

describe('largestStationCluster', () => {
  it('is empty without stations', () => {
    expect(largestStationCluster([], [])).toEqual([]);
  });

  it('counts a station without links as a network of its own', () => {
    expect(largestStationCluster([7], [])).toEqual([7]);
  });

  it('keeps the largest network of linked stations', () => {
    expect(
      largestStationCluster(
        [5, 1, 2, 3, 4],
        [
          [1, 2],
          [3, 2],
          [4, 5],
        ],
      ),
    ).toEqual([1, 2, 3]);
  });

  it('ignores the links towards stations not visited', () => {
    expect(
      largestStationCluster(
        [1, 2, 3],
        [
          [1, 9],
          [9, 2],
          [2, 3],
        ],
      ),
    ).toEqual([2, 3]);
  });
});
