// Shared C support text used by CLI projections. getopt_long owns option syntax.
export const cliRuntime = String.raw`
typedef struct { const char *name; int short_name; bool boolean; bool repeated; size_t field; } cli_flag;
typedef struct { bool present; size_t count; char **items; } cli_value;
static void cli_reset_getopt(void) {
#if defined(__APPLE__) || defined(__FreeBSD__) || defined(__OpenBSD__) || defined(__NetBSD__)
  optind = 1; optreset = 1;
#else
  optind = 0;
#endif
  opterr = 0;
}
static int cli_error(FILE *err, const char *message) {
  if (err) fprintf(err, "Error: %s\n", message);
  return 2;
}
static int cli_push(mi_heap_t *arena, cli_value *value, char *text, bool repeated) {
  if (value->present && !repeated) return 2;
  if (value->count == SIZE_MAX / sizeof(*value->items)) return 2;
  char **items = mi_heap_realloc(arena, value->items, (value->count + 1) * sizeof(*items));
  if (!items) return 2;
  value->items = items;
  value->items[value->count] = mi_heap_strdup(arena, text);
  if (!value->items[value->count]) return 2;
  ++value->count; value->present = true;
  return 0;
}
// cursor identifies the next token in the original argv. Root parsing stops
// at the first command; leaf parsing records positionals and resumes options.
static int cli_scan(mi_heap_t *arena, int argc, char **argv, int *cursor,
    const cli_flag *flags, size_t flag_count, cli_value *values,
    cli_value *positionals, bool root, FILE *err) {
  struct option *options = mi_heap_zalloc(arena, (flag_count + 2) * sizeof(*options));
  char *shorts = mi_heap_zalloc(arena, flag_count * 2 + 2);
  if (!options || !shorts) return cli_error(err, "allocation failed");
  size_t shorts_used = 0;
  shorts[shorts_used++] = '+';
  for (size_t i = 0; i < flag_count; ++i) {
    options[i] = (struct option){flags[i].name, flags[i].boolean ? no_argument : required_argument, NULL, 256 + (int)i};
    if (flags[i].short_name) {
      shorts[shorts_used++] = (char)flags[i].short_name;
      if (!flags[i].boolean) shorts[shorts_used++] = ':';
    }
  }
  options[flag_count] = (struct option){"help", no_argument, NULL, 256 + (int)flag_count};
  bool literal = false;
  while (*cursor < argc) {
    char *token = argv[*cursor];
    if (!literal && strcmp(token, "--") == 0) { literal = true; ++*cursor; continue; }
    if (literal || token[0] != '-' || !token[1] || (token[1] >= '0' && token[1] <= '9')) {
      if (root) return 0;
      if (cli_push(arena, positionals, token, true)) return cli_error(err, "allocation failed");
      ++*cursor; continue;
    }
    // Parse just this option and its possible following value. Supplying a
    // synthetic argv[0] makes getopt behavior identical on BSD and glibc.
    char *one[4] = {argv[0], token, *cursor + 1 < argc ? argv[*cursor + 1] : NULL, NULL};
    cli_reset_getopt();
    int option = getopt_long(one[2] ? 3 : 2, one, shorts, options, NULL);
    int consumed = optind - 1;
    if (option == 256 + (int)flag_count) return -1;
    size_t index = flag_count;
    if (option >= 256 && option < 256 + (int)flag_count) index = (size_t)(option - 256);
    else for (size_t i = 0; i < flag_count; ++i) if (flags[i].short_name && option == flags[i].short_name) { index = i; break; }
    if (index == flag_count) return cli_error(err, "unknown option or missing value");
    // A single argv element may contain a short-option cluster. Process every
    // remaining option in that element before advancing the original cursor.
    for (;;) {
      if (cli_push(arena, &values[flags[index].field], flags[index].boolean ? "true" : optarg, flags[index].repeated))
        return cli_error(err, "duplicate option or allocation failed");
      consumed = optind - 1;
      if (consumed > 0) break;
      option = getopt_long(one[2] ? 3 : 2, one, shorts, options, NULL);
      index = flag_count;
      if (option >= 256 && option < 256 + (int)flag_count) index = (size_t)(option - 256);
      else for (size_t i = 0; i < flag_count; ++i) if (flags[i].short_name && option == flags[i].short_name) { index = i; break; }
      if (index == flag_count) return cli_error(err, "unknown option");
    }
    *cursor += consumed;
  }
  return 0;
}
static bool cli_i64(const char *text, int64_t *out) {
  char *end = NULL; errno = 0;
  long long n = strtoll(text, &end, 10);
  if (errno || !*text || *end || text[0] == ' ' || text[0] == '\t') return false;
  *out = (int64_t)n; return true;
}
static bool cli_u64(const char *text, uint64_t *out) {
  char *end = NULL; errno = 0;
  unsigned long long n = strtoull(text, &end, 10);
  if (errno || !*text || *end || text[0] == '-' || text[0] == ' ' || text[0] == '\t') return false;
  *out = (uint64_t)n; return true;
}
static bool cli_real(const char *text, double *out) {
  char *end = NULL; errno = 0;
  double n = strtod(text, &end);
  if (errno || !*text || *end || !isfinite(n) || text[0] == ' ' || text[0] == '\t') return false;
  *out = n; return true;
}
`;
