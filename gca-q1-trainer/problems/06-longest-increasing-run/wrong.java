int solution(int[] a) {
    int best = 1, cur = 1;
    for (int i = 1; i < a.length; i++) {
        if (a[i] >= a[i - 1]) cur++;
        else cur = 1;
        if (cur > best) best = cur;
    }
    return best;
}
