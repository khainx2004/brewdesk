import java.sql.*;

/** Chạy SQL nhanh trên DB brewdesk — máy này không có psql. */
public class Sql {
    public static void main(String[] args) throws Exception {
        String url = System.getenv().getOrDefault("DB_URL", "jdbc:postgresql://localhost:5432/brewdesk");
        String user = System.getenv().getOrDefault("DB_USER", "brewdesk_user");
        String pass = System.getenv().getOrDefault("DB_PASSWORD", "");

        try (Connection c = DriverManager.getConnection(url, user, pass);
             Statement st = c.createStatement()) {
            for (String sql : args) {
                boolean isRs = st.execute(sql);
                if (isRs) {
                    try (ResultSet rs = st.getResultSet()) {
                        ResultSetMetaData m = rs.getMetaData();
                        int n = m.getColumnCount();
                        StringBuilder head = new StringBuilder();
                        for (int i = 1; i <= n; i++) head.append(m.getColumnLabel(i)).append(i < n ? " | " : "");
                        System.out.println(head);
                        System.out.println("-".repeat(Math.max(10, head.length())));
                        while (rs.next()) {
                            StringBuilder row = new StringBuilder();
                            for (int i = 1; i <= n; i++) row.append(rs.getString(i)).append(i < n ? " | " : "");
                            System.out.println(row);
                        }
                    }
                } else {
                    System.out.println("updated: " + st.getUpdateCount());
                }
                System.out.println();
            }
        }
    }
}
