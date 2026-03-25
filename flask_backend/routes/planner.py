from flask import Blueprint, request, jsonify
from models import db, User, PlannerTask
from datetime import datetime

planner_bp = Blueprint('planner', __name__)

@planner_bp.route('/list/<reg_number>', methods=['GET'])
def list_tasks(reg_number):
    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    tasks = PlannerTask.query.filter_by(user_id=user.id).order_by(PlannerTask.created_at.desc()).all()
    return jsonify([{
        "id": t.id,
        "text": t.text,
        "priority": t.priority,
        "category": t.category,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "completed": t.completed,
        "created_at": t.created_at.isoformat()
    } for t in tasks])

@planner_bp.route('/save', methods=['POST'])
def save_task():
    data = request.json
    reg_number = data.get('registration_number')
    user = User.query.filter_by(registration_number=reg_number).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    task_id = data.get('id')
    text = data.get('text')
    priority = data.get('priority', 'Medium')
    category = data.get('category')
    due_date_str = data.get('due_date')
    
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', ''))
        except: pass

    if task_id:
        task = PlannerTask.query.get(task_id)
        if task and task.user_id == user.id:
            task.text = text
            task.priority = priority
            task.category = category
            task.due_date = due_date
        else:
            return jsonify({"error": "Task not found"}), 404
    else:
        task = PlannerTask(
            user_id=user.id,
            text=text,
            priority=priority,
            category=category,
            due_date=due_date
        )
        db.session.add(task)
    
    db.session.commit()
    return jsonify({"message": "Task saved", "id": task.id}), 201

@planner_bp.route('/toggle/<int:task_id>', methods=['POST'])
def toggle_task(task_id):
    task = PlannerTask.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    task.completed = not task.completed
    db.session.commit()
    return jsonify({"message": "Toggled", "completed": task.completed})

@planner_bp.route('/delete/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = PlannerTask.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Deleted"})
