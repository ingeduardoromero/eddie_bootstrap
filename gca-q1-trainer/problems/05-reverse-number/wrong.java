int solution(int n) {
    int rev = 0;
    for (int i = 0; i < 9 && n > 0; i++) {
        rev = rev * 10 + n % 10;
        n /= 10;
    }
    return rev;
}
