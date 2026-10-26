import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_URL = "/tasks";
const AUTH_URL = "/auth";

function App() {
    const [tasks, setTasks] = useState([]);
    const [token, setToken] = useState(() =>
        window.localStorage.getItem("taskManagerToken") || ""
    );
    const [user, setUser] = useState(null);
    const [authMode, setAuthMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authNotice, setAuthNotice] = useState("");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    // ==========================================
    // SHOW TOAST MESSAGE
    // ==========================================

    const showMessage = (text) => {
        setMessage(text);

        setTimeout(() => {
            setMessage("");
        }, 3000);
    };

    const handleUnauthorized = useCallback(() => {
        window.localStorage.removeItem("taskManagerToken");
        setToken("");
        setUser(null);
        setTasks([]);
        setAuthMode("login");
        setAuthNotice("Your session has expired. Please sign in again.");
    }, []);

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error("Please sign in to continue.");
        }

        return response;
    }, [handleUnauthorized, token]);


    // ==========================================
    // REGISTER OR LOG IN
    // ==========================================

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setAuthNotice("");

        try {
            const response = await fetch(`${AUTH_URL}/${authMode}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Authentication failed");
            }

            if (authMode === "register") {
                setAuthMode("login");
                setAuthNotice("Account created. Sign in with your new account.");
                setPassword("");
                return;
            }

            window.localStorage.setItem("taskManagerToken", data.token);
            setToken(data.token);
            setUser(data.user);
            setPassword("");
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        window.localStorage.removeItem("taskManagerToken");
        setToken("");
        setUser(null);
        setTasks([]);
        setAuthNotice("");
    };


    // ==========================================
    // LOAD TASKS
    // ==========================================

    // ==========================================
    // CREATE TASK
    // ==========================================

    const addTask = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            setError("Task title is required");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await authenticatedFetch(API_URL, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    title: title,
                    description: description,
                    completed: false,
                    priority: "medium"
                })
            });

            if (!response.ok) {
                throw new Error("Failed to create task");
            }

            const data = await response.json();

            // Update React state using server response
            setTasks((prevTasks) => [
                ...prevTasks,
                data.task
            ]);

            setTitle("");
            setDescription("");

            showMessage("Task created successfully");

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };


    // ==========================================
    // UPDATE TASK
    // ==========================================

    const updateTask = async (task) => {
        const newTitle = window.prompt(
            "Enter new task title:",
            task.title
        );

        if (!newTitle || !newTitle.trim()) {
            return;
        }

        const newDescription = window.prompt(
            "Enter new description:",
            task.description || ""
        );

        try {
            setLoading(true);
            setError("");

            const response = await authenticatedFetch(
                `${API_URL}/${task._id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        title: newTitle,
                        description: newDescription,
                        completed: task.completed,
                        priority: task.priority || "medium"
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update task");
            }

            const data = await response.json();

            // Replace old task with server response
            setTasks((prevTasks) =>
                prevTasks.map((item) =>
                    item._id === task._id
                        ? data.task
                        : item
                )
            );

            showMessage("Task updated successfully");

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };


    // ==========================================
    // DELETE TASK
    // ==========================================

    const deleteTask = async (id) => {

        // STUDENT ASSIGNMENT:
        // Confirmation before delete

        const confirmed = window.confirm(
            "Are you sure you want to delete this task?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await authenticatedFetch(
                `${API_URL}/${id}`,
                {
                    method: "DELETE"
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete task");
            }

            // Remove task from React state
            setTasks((prevTasks) =>
                prevTasks.filter(
                    (task) => task._id !== id
                )
            );

            // STUDENT ASSIGNMENT:
            // Success notification

            showMessage("Task deleted successfully");

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };


    // ==========================================
    // GET TASKS WHEN PAGE LOADS
    // ==========================================

    useEffect(() => {
        if (!token) {
            return;
        }

        let cancelled = false;

        const loadSession = async () => {
            try {
                const profileResponse = await authenticatedFetch(`${AUTH_URL}/me`);
                if (!profileResponse.ok) {
                    throw new Error("Failed to load your account");
                }

                const profile = await profileResponse.json();
                if (cancelled) return;
                setUser(profile.user);

                const tasksResponse = await authenticatedFetch(API_URL);
                if (!tasksResponse.ok) {
                    const data = await tasksResponse.json();
                    throw new Error(data.message || "Failed to fetch tasks");
                }

                const taskData = await tasksResponse.json();
                if (!cancelled) setTasks(taskData);
            } catch (error) {
                if (!cancelled) setError(error.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadSession();
        return () => {
            cancelled = true;
        };
    }, [authenticatedFetch, token]);


    // ==========================================
    // UI
    // ==========================================

    if (!token) {
        return (
            <div className="container">
                <h1>Task Manager</h1>
                <form onSubmit={handleAuth}>
                    <h2>{authMode === "login" ? "Sign in" : "Create account"}</h2>
                    {authNotice && <p>{authNotice}</p>}
                    {error && <div className="error">{error}</div>}
                    <input
                        type="email"
                        placeholder="Email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password (at least 8 characters)"
                        autoComplete={authMode === "login" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading
                            ? "Please wait..."
                            : authMode === "login" ? "Sign in" : "Register"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setAuthMode(authMode === "login" ? "register" : "login");
                            setError("");
                            setAuthNotice("");
                        }}
                    >
                        {authMode === "login"
                            ? "Need an account? Register"
                            : "Already registered? Sign in"}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="container">

            <h1>Task Manager</h1>
            {user && (
                <p>
                    Signed in as {user.email}
                    <button type="button" onClick={logout}>Sign out</button>
                </p>
            )}
            {token && !user && (
                <p>Restoring your session...</p>
            )}


            {/* Toast / Notification */}

            {message && (
                <div className="toast">
                    {message}
                </div>
            )}


            {/* Error */}

            {error && (
                <div className="error">
                    {error}
                </div>
            )}


            {/* Loading */}

            {loading && (
                <p className="loading">
                    Loading...
                </p>
            )}


            {/* CREATE FORM */}

            <form onSubmit={addTask}>

                <input
                    type="text"
                    placeholder="Task title"
                    value={title}
                    onChange={(e) =>
                        setTitle(e.target.value)
                    }
                />

                <input
                    type="text"
                    placeholder="Task description"
                    value={description}
                    onChange={(e) =>
                        setDescription(e.target.value)
                    }
                />

                <button type="submit">
                    Add Task
                </button>

            </form>


            {/* TASK LIST */}

            <h2>Tasks</h2>

            {tasks.length === 0 && !loading && (
                <p>No tasks available.</p>
            )}


            {tasks.map((task) => (

                <div
                    className="task"
                    key={task._id}
                >

                    <h3>{task.title}</h3>

                    <p>
                        {task.description}
                    </p>

                    <p>
                        Status:
                        {task.completed
                            ? " Completed"
                            : " Pending"}
                    </p>

                    <p>
                        Priority:
                        {task.priority || "medium"}
                    </p>


                    {/* UPDATE */}

                    <button
                        onClick={() =>
                            updateTask(task)
                        }
                    >
                        Update
                    </button>


                    {/* DELETE */}

                    <button
                        onClick={() =>
                            deleteTask(task._id)
                        }
                    >
                        Delete
                    </button>

                </div>

            ))}

        </div>
    );
}

export default App;