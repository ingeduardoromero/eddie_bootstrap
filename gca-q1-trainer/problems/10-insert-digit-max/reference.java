long solution(int n, int d) {
    boolean neg = n < 0;
    String s = String.valueOf(Math.abs((long) n));
    int i = 0;
    while (i < s.length() && (neg ? s.charAt(i) - '0' <= d : s.charAt(i) - '0' >= d)) i++;
    long v = Long.parseLong(s.substring(0, i) + d + s.substring(i));
    return neg ? -v : v;
}
