from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MongoDB configuration
uri = 'mongodb://localhost:27017'  # Change this to your MongoDB URI
db_name = 'Raytio'  # Change this to your database name

# Connect to MongoDB
try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    print(f'Connected to database: {db_name}')
except Exception as e:
    print('Failed to connect to MongoDB')
    exit()

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    try:
        user = db['Users'].find_one({'user.name': username})
        if user and user['user']['password'] == password:
            return jsonify({'success': True}), 200
        else:
            return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

if __name__ == '__main__':
    app.run(port=3000)

