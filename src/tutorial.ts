/** Completion is persisted by the existing campaign progress. */
export function showFirstDigHint(stage:number,completed:number,digs:readonly number[],firstCell:number,won:boolean){
  return stage===0&&completed===0&&!won&&!digs.includes(firstCell);
}
