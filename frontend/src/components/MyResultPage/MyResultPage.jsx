const Badge = ({ percent }) => {
  if (percent >= 85)
    return <span className={resultStyles.badgeExcellent}>Excellent</span>;
  if (percent >= 65)
    return <span className={resultStyles.badgeGood}>Good</span>;
  if (percent >= 45)
    return <span className={resultStyles.badgeAverage}>Average</span>;
  return <span className={resultStyles.badgeNeedsWork}>Needs Work</span>;
};

export default function MyResultPage({ apiBase = "http://localhost:5000" }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTechnology, setSelectedTechnology] = useState("all");
  const [technologies, setTechnologies] = useState([]);

  const getAuthHeader = useCallback(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);
// Effect: Fetch results when component mounts or when selectedTechnology changes
  useEffect(() => {
    let mounted = true;
    const fetchResults = async (tech = "all") => {
      setLoading(true);
      setError(null);
      try {
        const q =
          tech && tech.toLowerCase() !== "all"
            ? `?technology=${encodeURIComponent(tech)}`
            : "";
        const res = await axios.get(`${apiBase}/api/results${q}`, {
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          timeout: 10000,
        });
        if (!mounted) return;
        if (res.status === 200 && res.data && res.data.success) {
          setResults(Array.isArray(res.data.results) ? res.data.results : []);
        } else {
          setResults([]);
          toast.warn("Unexpected server response while fetching results.");
        }
      } catch (err) {
        console.error(
          "Failed to fetch results:",
          err?.response?.data || err.message || err
        );
        if (!mounted) return;
        if (err?.response?.status === 401) {
          setError("Not authenticated. Please log in to view results.");
          toast.error("Not authenticated. Please login.");
        } else {
          setError("Could not load results from server.");
          toast.error("Could not load results from server.");
          setResults([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchResults(selectedTechnology);
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, selectedTechnology, getAuthHeader]);


// Effect: fetch all results once (or when apiBase changes) to build a list
// of available `technologies` for filter buttons.
  useEffect(() => {
    let mounted = true;
    const fetchAllForTechList = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/results`, {
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          timeout: 10000,
        });
        if (!mounted) return;
        if (res.status === 200 && res.data && res.data.success) {
          const all = Array.isArray(res.data.results) ? res.data.results : [];
          const set = new Set();
          all.forEach((r) => {
            if (r.technology) set.add(r.technology);
          });
          const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
          console.log(arr);

          setTechnologies(arr);
        } else {
          // leave technologies empty (will still show "All")
        }
      } catch (err) {
        // silent — no need to block main UI; log for debug
        console.error(
          "Failed to fetch technologies:",
          err?.response?.data || err.message || err
        );
      }
    };
    fetchAllForTechList();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, getAuthHeader]);

  const makeKey = (r) => (r && r._id ? r._id : `${r.id}||${r.title}`);

  // `summary` is memoized so it only recalculates when `results` changes.
// It aggregates totals and computes an overall percentage.
  const summary = useMemo(() => {
    const source = Array.isArray(results) ? results : [];
    const totalQs = source.reduce(
      (s, r) => s + (Number(r.totalQuestions) || 0),
      0
    );
    const totalCorrect = source.reduce(
      (s, r) => s + (Number(r.correct) || 0),
      0
    );
    const totalWrong = source.reduce((s, r) => s + (Number(r.wrong) || 0), 0);
    const pct = totalQs ? Math.round((totalCorrect / totalQs) * 100) : 0;
    return { totalQs, totalCorrect, totalWrong, pct };
  }, [results]);

  // Group results by the first word of the title (used as "track")
  const grouped = useMemo(() => {
    const src = Array.isArray(results) ? results : [];
    const map = {};
    src.forEach((r) => {
      const track = (r.title || "").split(" ")[0] || "General";
      if (!map[track]) map[track] = [];
      map[track].push(r);
    });
    return map;
  }, [results]);

  // Handler called when user clicks a technology filter button
  const handleSelectTech = (tech) => {
    setSelectedTechnology(tech || "all");
  };


            <div className={resultStyles.filterButtons}>
              <span className={resultStyles.filterLabel}>Filter by tech:</span>

              {/* dynamic technology buttons */}
              {technologies.map((tech) => (
                <button
                  key={tech}
                  onClick={() => handleSelectTech(tech)}
                  className={`${resultStyles.filterButton} ${
                    selectedTechnology === tech
                      ? resultStyles.filterButtonActive
                      : resultStyles.filterButtonInactive
                  }`}
                >
                  {tech}
                </button>
              ))}

              {/* If we don't yet have technologies but results exist, derive from current results */}
              {technologies.length === 0 &&
                Array.isArray(results) &&
                results.length > 0 &&
                [
                  ...new Set(results.map((r) => r.technology).filter(Boolean)),
                ].map((tech) => (
                  <button
                    key={`fallback-${tech}`}
                    onClick={() => handleSelectTech(tech)}
                    className={`${resultStyles.filterButton} ${
                      selectedTechnology === tech
                        ? resultStyles.filterButtonActive
                        : resultStyles.filterButtonInactive
                    }`}
                    aria-pressed={selectedTechnology === tech}
                  >
                    {tech}
                  </button>
                ))}
            </div>



/* --------------------- StripCard component --------------------- */
function StripCard({ item }) {
  const percent = item.totalQuestions
    ? Math.round((Number(item.correct) / Number(item.totalQuestions)) * 100)
    : 0;

  const getLevel = (it) => {
    const id = (it.id || "").toString().toLowerCase();
    const title = (it.title || "").toString().toLowerCase();
    if (id.includes("basic") || title.includes(" basic"))
      return { letter: "B", style: resultStyles.levelBasic };
    if (id.includes("intermediate") || title.includes(" intermediate"))
      return { letter: "I", style: resultStyles.levelIntermediate };
    return { letter: "A", style: resultStyles.levelAdvanced };
  };

  const level = getLevel(item);


       {item.timeSpent ? ` • ${item.timeSpent}` : ""}
  
}


