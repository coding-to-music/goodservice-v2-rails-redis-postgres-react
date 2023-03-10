import React from 'react';
import { cloneDeep } from "lodash";

import TrainMapStop from './trainMapStop.jsx';
import './trainMap.scss'

class TrainMap extends React.Component {
  calculateStops() {
    const { routings } = this.props;
    const southStops = {};
    const northStops = {};

    if (!routings) {
      return;
    }

    routings.south?.forEach((r) => {
      r.forEach((stopId) => {
        southStops[stopId] = true;
      });
    });
    routings.north?.forEach((r) => {
      r.forEach((stopId) => {
        northStops[stopId] = true;
      });
    }); 

    return { southStops: southStops, northStops: northStops };
  }

  generateSegments() {
    const { routings } = this.props;

    if (!routings ) {
      return;
    }

    const southRoutings = routings.south?.map((obj) => [...obj]) || [];

    const northRoutings = routings.north?.map((obj) => {
      return [...obj].reverse();
    }) || [];

    const allRoutings = southRoutings.concat(northRoutings);

    const line = allRoutings[0];

    if (!line) {
      return;
    }

    const lineCopy = [...line];
    const branches = [lineCopy];

    const remainingRoutings = [];

    allRoutings.forEach((lineObj) => {
      if (lineObj.every(val => line.includes(val))) {
        return;
      }
      let lastMatchingStop = null;
      let stopsToBeAdded = [];

      lineObj.forEach((stop) => {
        if (line.includes(stop)) {
          if (stopsToBeAdded.length) {
            const currStopPosition = line.indexOf(stop);

            if (!lastMatchingStop) {
              const matchingBranchToAppend = branches.find((obj) => {
                return obj.indexOf(stop) == 0;
              })

              if (matchingBranchToAppend) {
                const branchStartPosInLine = line.indexOf(matchingBranchToAppend[0]);
                line.splice(branchStartPosInLine, 0, ...stopsToBeAdded);
                matchingBranchToAppend.splice(0, 0, ...stopsToBeAdded);
              } else {
                // branch from the top
                line.splice(currStopPosition, 0, ...stopsToBeAdded);
                stopsToBeAdded.push(stop)
                branches.push(stopsToBeAdded);
              }
            } else {
              const branchToInsert = branches.find((obj) => {
                const prevMatchingStopPosition = obj.indexOf(lastMatchingStop);
                const currMatchingStopPosition = obj.indexOf(stop);

                return prevMatchingStopPosition > -1 && currMatchingStopPosition > -1 && (currMatchingStopPosition - prevMatchingStopPosition) === 1;
              });
              const branchToPrependBeginning = branches.find((obj) => {
                const prevMatchingStopPosition = obj.indexOf(lastMatchingStop);
                const currMatchingStopPosition = obj.indexOf(stop);

                return prevMatchingStopPosition == -1 && currMatchingStopPosition == 0;
              });

              const branchToAppendEnd = branches.find((obj) => {
                const prevMatchingStopPosition = obj.indexOf(lastMatchingStop);
                const currMatchingStopPosition = obj.indexOf(stop);

                return prevMatchingStopPosition == (obj.length - 1) && currMatchingStopPosition == -1;
              });

              if (branchToInsert) {
                // adding intermediate stops
                line.splice(currStopPosition, 0, ...stopsToBeAdded);
                const lastMatchingStopPositionInBranch = branchToInsert.indexOf(lastMatchingStop);
                branchToInsert.splice(lastMatchingStopPositionInBranch + 1, 0, ...stopsToBeAdded);
              } else if (branchToPrependBeginning) {
                // prepend to beginning of a branch
                line.splice(currStopPosition - 1, 0, ...stopsToBeAdded);
                stopsToBeAdded.splice(0, 0, lastMatchingStop);
                branchToPrependBeginning.splice(0, 0, ...stopsToBeAdded);
              } else if (branchToAppendEnd) {
                // append to end of a branch
                const linePos = line.indexOf(lastMatchingStop);
                line.splice(linePos + 1, 0, ...stopsToBeAdded);
                stopsToBeAdded.push(stop);
                branchToAppendEnd.splice(branchToAppendEnd.length - 1, 0, ...stopsToBeAdded);
              } else {
                // adding middle branch
                line.splice(currStopPosition, 0, ...stopsToBeAdded);
                stopsToBeAdded.splice(0, 0, lastMatchingStop);
                stopsToBeAdded.push(stop);
                branches.push(stopsToBeAdded);
              }
            }
          }
          stopsToBeAdded = [];
          lastMatchingStop = stop;
        } else {
          stopsToBeAdded.push(stop);
        }
      });

      if (stopsToBeAdded.length) {
        if (lastMatchingStop === line[line.length - 1]) {
          // append to end of line
          line.splice(line.length, 0, ...stopsToBeAdded);
          branches[0].splice(branches[0].length - 1, 0, ...stopsToBeAdded);
        } else {
          // branch from the bottom
          if (lastMatchingStop) {
            const lastMatchingStopPosition = line.indexOf(lastMatchingStop);
            line.splice(lastMatchingStopPosition + 1, 0, ...stopsToBeAdded);
            stopsToBeAdded.splice(0, 0, lastMatchingStop);
          } else {
            line.push("");
            line.splice(line.length, 0, ...stopsToBeAdded);
          }
          branches.push(stopsToBeAdded);
        }
      }
    });

    return {
      line: line,
      branches: branches
    };
  }

  getStationsWithAmbigiousNames(routings, scheduledRoutings, stations) {
    if (!routings) {
      return;
    }

    const stationNames = {};

    routings.south?.forEach((r) => {
      r.forEach((stopId) => {
        const station = stations[stopId];
        if (station) {
          if (stationNames[station.name]) {
            if (!stationNames[station.name].includes(stopId)) {
              stationNames[station.name].push(stopId);
            }
          } else {
            stationNames[station.name] = [stopId];
          }
        }
      });
    });
    routings.north?.forEach((r) => {
      r.forEach((stopId) => {
        const station = stations[stopId];
        if (station) {
          if (stationNames[station.name]) {
            if (!stationNames[station.name].includes(stopId)) {
              stationNames[station.name].push(stopId);
            }
          } else {
            stationNames[station.name] = [stopId];
          }
        }
      });
    });

    if (scheduledRoutings) {
      scheduledRoutings.south?.forEach((r) => {
        r.forEach((stopId) => {
          const station = stations[stopId];
          if (station) {
            if (stationNames[station.name]) {
              if (!stationNames[station.name].includes(stopId)) {
                stationNames[station.name].push(stopId);
              }
            } else {
              stationNames[station.name] = [stopId];
            }
          }
        });
      });
      scheduledRoutings.north?.forEach((r) => {
        r.forEach((stopId) => {
          const station = stations[stopId];
          if (station) {
            if (stationNames[station.name]) {
              if (!stationNames[station.name].includes(stopId)) {
                stationNames[station.name].push(stopId);
              }
            } else {
              stationNames[station.name] = [stopId];
            }
          }
        });
      });
    }

    return Object.keys(stationNames).filter((key) => stationNames[key].length > 1).flatMap((key) => stationNames[key]);
  }

  render() {
    const { routings, trains, train, showTravelTime, direction, trips, stations, scheduledRoutings } = this.props;
    const color = train.color;
    const segments = this.generateSegments();
    const stopPattern = this.calculateStops();
    const stationsWithAmbiguousNames = this.getStationsWithAmbigiousNames(routings, scheduledRoutings, stations);
    let previousStopId;
    let branchedStopId;
    let overrideStopId;

    let currentBranches = [0];
    if (segments) {
      return(
        <div className='train-map'>
          <ul>
            {
              segments.line.map((stopId, lineIndex) => {
                let branchStart = null;
                let branchEnd = null;
                let branchStops = [];
                let count = 0;
                const currentMaxBranch = currentBranches[currentBranches.length - 1];
                let transfers = Object.assign({}, stations[stopId]?.routes);
                if (stations[stopId]?.transfers) {
                  stations[stopId]?.transfers.forEach((s) => {
                    transfers = Object.assign(transfers, stations[s]?.routes);
                  });
                }
                delete transfers[train.id];
                let station = stations[stopId];
                overrideStopId = null;
                if (stopId === "") {
                  segments.branches.splice(0, 1);
                  currentBranches = [];
                } else {
                  const potentialBranch = segments.branches.find((obj, index) => {
                    return !currentBranches.includes(index) && obj.includes(stopId);
                  });
                  if (potentialBranch) {
                    const potentialBranchIndex = segments.branches.indexOf(potentialBranch);
                    const currentBranchIncludesStop = currentBranches.find((obj) => {
                      return segments.branches[obj].includes(stopId);
                    });
                    const branchesToTraverse = [...currentBranches];
                    branchedStopId = stopId;
                    if (currentBranchIncludesStop || currentBranchIncludesStop === 0) {
                      branchStart = branchesToTraverse.length - 1;
                      segments.branches[potentialBranchIndex].splice(0, 1);
                    } else {
                      branchesToTraverse.push(potentialBranchIndex);
                      overrideStopId = potentialBranch[potentialBranch.length - 1];
                    }

                    branchesToTraverse.forEach((obj) => {
                      let branchStopsHere = segments.branches[obj].includes(stopId);
                      branchStops.push(branchStopsHere);
                      if (branchStopsHere) {
                        const i = segments.branches[obj].indexOf(stopId);
                        segments.branches[obj].splice(i, 1);
                      }
                    });
                    currentBranches.push(potentialBranchIndex);
                  } else if (currentBranches.length > 1 &&
                      (segments.branches[currentMaxBranch][segments.branches[currentMaxBranch].length - 1] === stopId) &&
                      segments.branches[currentBranches[currentBranches.length - 2]].includes(stopId)) {
                    branchEnd = currentBranches[currentBranches.length - 2];

                    currentBranches.pop();
                    // branch back
                    currentBranches.forEach((obj) => {
                      let branchStopsHere = segments.branches[obj].includes(stopId);
                      branchStops.push(branchStopsHere);
                      if (branchStopsHere) {
                        const i = segments.branches[obj].indexOf(stopId);
                        segments.branches[obj].splice(i, 1);
                      }
                    });
                  } else if (currentBranches.length > 1 && segments.branches[currentMaxBranch].length === 0) {
                    // branch ends
                    currentBranches.pop();

                    currentBranches.forEach((obj) => {
                      let branchStopsHere = segments.branches[obj].includes(stopId);
                      branchStops.push(branchStopsHere);
                      if (branchStopsHere) {
                        const i = segments.branches[obj].indexOf(stopId);
                        segments.branches[obj].splice(i, 1);
                      }
                    });
                    previousStopId = branchedStopId;
                  } else {
                    currentBranches.forEach((obj) => {
                      let branchStopsHere = segments.branches[obj].includes(stopId);
                      branchStops.push(branchStopsHere);
                      if (branchStopsHere) {
                        const i = segments.branches[obj].indexOf(stopId);
                        segments.branches[obj].splice(i, 1);
                      }
                    });
                  }
                }
                let activeBranches = currentBranches.map((obj, index) => {
                  return branchStops[index] || segments.branches[obj].length > 0;
                });
                if (branchStart !== null) {
                  activeBranches = activeBranches.slice(0, activeBranches.length - 1);
                }
                const results = (
                  <TrainMapStop key={stopId} trains={trains} train={train} stopId={stopId} previousStopId={previousStopId} overrideStopId={overrideStopId} station={station} southStop={stopPattern.southStops[stopId]}
                    northStop={stopPattern.northStops[stopId]} transfers={transfers} branchStops={branchStops} branchStart={branchStart}
                    branchEnd={branchEnd} activeBranches={activeBranches} showTravelTime={showTravelTime} showSecondaryName={stationsWithAmbiguousNames.includes(stopId)}
                    trips={trips && trips.filter((t) => t.upcoming_stop === stopId )} direction={direction}/>
                );
                previousStopId = stopId;
                return results;
              })
            }
          </ul>
        </div>
      )
    }
    return (<div></div>)
  }
}
export default TrainMap;