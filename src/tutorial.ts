/** Completion is persisted by the existing campaign progress and star records. */
export function showFirstDigHint(stage:number,completed:number,stars:number,digs:readonly number[],firstCell:number,won:boolean){
  return stage===0&&completed===0&&stars===0&&!won&&!digs.includes(firstCell);
}
