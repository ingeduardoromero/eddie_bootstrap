int solution(String s, String p) {
    int count = 0;
    int i = s.indexOf(p);
    while (i >= 0) {
        count++;
        i = s.indexOf(p, i + 1);
    }
    return count;
}
