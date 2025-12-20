const UserService = require("../services/userService");

class UserController {
  async getProfile(req, res) {
    try {
      // Assume middleware sets req.user
      const userId = req.user.userId;
      const user = await UserService.getProfile(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updatedUser = await UserService.updateProfile(userId, req.body);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getUserById(req, res) {
    try {
      const { user_id } = req.params;
      const requestorRole = req.user.role;
      const requestorId = req.user.userId;

      // Access Control: Admin or Self
      if (requestorRole !== "admin" && requestorId !== user_id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const user = await UserService.getUserById(user_id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      // Access Control: Admin only
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { user_id } = req.params;
      const updatedUser = await UserService.updateStatus(user_id, req.body);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new UserController();
