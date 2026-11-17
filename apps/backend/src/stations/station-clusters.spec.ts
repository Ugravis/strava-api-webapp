import {
  replayStationGains,
  type StationLink,
  stationNetworks,
} from './station-clusters';

const link = (a: number, b: number, lengthM = 1000): StationLink => ({
  a,
  b,
  lengthM,
});

describe('replayStationGains', () => {
  it('tells the new stations and the growth of the largest network of each activity', () => {
    const links = [link(1, 2), link(2, 3), link(4, 5)];
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
      [link(1, 2), link(2, 3)],
    );
    expect(gains.reduce((total, gain) => total + gain.maxCluster, 0)).toBe(3);
  });
});

describe('stationNetworks', () => {
  it('is empty without stations', () => {
    expect(stationNetworks([], [])).toEqual({
      maxCluster: [],
      maxClusterM: 0,
      otherClusters: 0,
      otherClustersM: 0,
    });
  });

  it('counts a station without links as a network of its own, never as another cluster', () => {
    expect(stationNetworks([7, 8], [])).toEqual({
      maxCluster: [7],
      maxClusterM: 0,
      otherClusters: 0,
      otherClustersM: 0,
    });
  });

  it('keeps the largest network and the railway of each', () => {
    expect(
      stationNetworks(
        [5, 1, 2, 3, 4, 6],
        [link(1, 2, 1200), link(3, 2, 800), link(4, 5, 500)],
      ),
    ).toEqual({
      maxCluster: [1, 2, 3],
      maxClusterM: 2000,
      otherClusters: 2,
      otherClustersM: 500,
    });
  });

  it('ignores the links towards stations not visited', () => {
    expect(
      stationNetworks([1, 2, 3], [link(1, 9), link(9, 2), link(2, 3)])
        .maxCluster,
    ).toEqual([2, 3]);
  });
});
