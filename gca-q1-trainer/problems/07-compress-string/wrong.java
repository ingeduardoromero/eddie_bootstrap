String solution(String s) {
    StringBuilder sb = new StringBuilder();
    int i = 0;
    while (i < s.length()) {
        int j = i;
        while (j < s.length() && s.charAt(j) == s.charAt(i)) j++;
        sb.append(s.charAt(i));
        if (j - i > 1) sb.append((char) ('0' + (j - i)));
        i = j;
    }
    return sb.toString();
}
