import {test} from 'node:test';
import assert from 'node:assert/strict';
import {showFirstDigHint} from '../src/tutorial';
test('first-dig hint follows the suggested tile and can return on automatic reset before completion',()=>{
  assert.equal(showFirstDigHint(0,0,[],25,false),true);
  assert.equal(showFirstDigHint(0,0,[26],25,false),true);
  assert.equal(showFirstDigHint(0,0,[25],25,false),false);
  assert.equal(showFirstDigHint(0,0,[],25,false),true);
});
test('completed saves, other stages and wins never show the first-level hint',()=>{
  assert.equal(showFirstDigHint(0,1,[],25,false),false);
  assert.equal(showFirstDigHint(1,0,[],25,false),false);
  assert.equal(showFirstDigHint(0,0,[],25,true),false);
});
