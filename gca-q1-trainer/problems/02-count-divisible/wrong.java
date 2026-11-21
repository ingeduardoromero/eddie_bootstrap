int solution(int[] a, int k) {
    int count = 0;
    for (int i = 0; i < a.length; i++) {
        if (a[i] > 0 && a[i] % k == 0) {
            count++;
        }
    }
    return count;
}
