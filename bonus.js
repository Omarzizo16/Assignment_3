/**
 * LeetCode Problem: 169. Majority Element
 *
 * Given an array nums of size n, return the majority element.
 * The majority element is the element that appears more than ⌊n / 2⌋ times.
 * You may assume that the majority element always exists in the array.
 *
 * Example 1:
 * Input: nums = [3,2,3]
 * Output: 3
 *
 * Example 2:
 * Input: nums = [2,2,1,1,1,2,2]
 * Output: 2
 */

/**
 * @param {number[]} nums
 * @return {number}
 */

var majorityElementSort = function (nums) {
  nums.sort((a, b) => a - b);
  return nums[Math.floor(nums.length / 2)];
};

//Another solution but i search it

var majorityElement = function (nums) {
  let pointer = null;
  let count = 0;
  for (let num of nums) {
    if (count === 0) {
      pointer = num;
    }
    count += num === pointer ? 1 : -1;
  }
  return pointer;
};
