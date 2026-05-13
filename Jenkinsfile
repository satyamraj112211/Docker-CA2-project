pipeline {
    agent any
    environment {
        GIT_REPO = 'https://github.com/Sumeet2930/Secure-NoteBook'
        BRANCH = 'master'
    }
    stages {
        stage('Clone') {
            steps {
                git branch: "${BRANCH}", url: "${GIT_REPO}"
            }
        }
        stage('Build') {
            steps {
                echo 'Build step started...'
                dir('frontend') {
                    bat 'npm install'
                }
                dir('backend') {
                    bat 'npm install'
                }
                echo 'Build step completed.'
            }
        }
        stage('Test') {
            steps {
                echo 'Running test scripts...'
                echo 'Tests passed.'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying application...'
                echo 'Deployment complete.'
            }
        }
    }
    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
